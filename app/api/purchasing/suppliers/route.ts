import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhà cung cấp'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        s.id,
        s.supplier_code as "supplierCode",
        s.supplier_name as "supplierName",
        s.phone,
        s.email,
        s.address,
        sg.group_name as "groupName",
        s.debt_amount as "debtAmount",
        s.is_active as "isActive",
        s.created_at as "createdAt"
       FROM suppliers s
       LEFT JOIN supplier_groups sg ON sg.id = s.supplier_group_id
       WHERE s.branch_id = $1
       ORDER BY s.created_at DESC`,
      [currentUser.branchId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhà cung cấp'
      }, { status: 403 });
    }

    const body = await request.json();
    const { supplierCode, supplierName, phone, email, address, supplierGroupId } = body;

    const checkResult = await query(
      'SELECT id FROM suppliers WHERE supplier_code = $1',
      [supplierCode]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhà cung cấp đã tồn tại'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO suppliers (
        supplier_code, supplier_name, phone, email, address, 
        supplier_group_id, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        supplierCode,
        supplierName,
        phone || null,
        email || null,
        address || null,
        supplierGroupId || null,
        currentUser.branchId
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
