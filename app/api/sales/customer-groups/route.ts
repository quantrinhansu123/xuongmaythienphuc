import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        cg.id,
        cg.group_code as "groupCode",
        cg.group_name as "groupName",
        cg.price_multiplier as "priceMultiplier",
        cg.description,
        cg.created_at as "createdAt",
        COUNT(c.id) as "customerCount"
       FROM customer_groups cg
       LEFT JOIN customers c ON c.customer_group_id = cg.id
       GROUP BY cg.id, cg.group_code, cg.group_name, cg.price_multiplier, cg.description, cg.created_at
       ORDER BY cg.group_name`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get customer groups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhóm khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { groupCode, groupName, priceMultiplier, description } = body;

    // Kiểm tra mã nhóm trùng
    const checkResult = await query(
      'SELECT id FROM customer_groups WHERE group_code = $1',
      [groupCode]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhóm đã tồn tại'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO customer_groups (group_code, group_name, price_multiplier, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [groupCode, groupName, parseFloat(priceMultiplier), description || null]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
