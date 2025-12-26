import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm NCC'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        id,
        group_code as "groupCode",
        group_name as "groupName",
        description
       FROM supplier_groups
       ORDER BY group_name`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get supplier groups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhóm NCC'
      }, { status: 403 });
    }

    const body = await request.json();
    const { groupCode, groupName, description } = body;

    const checkResult = await query(
      'SELECT id FROM supplier_groups WHERE group_code = $1',
      [groupCode]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhóm đã tồn tại'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO supplier_groups (group_code, group_name, description)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [groupCode, groupName, description || null]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create supplier group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
