import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

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
       WHERE cg.id = $1
       GROUP BY cg.id, cg.group_code, cg.group_name, cg.price_multiplier, cg.description, cg.created_at`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy nhóm khách hàng'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { groupName, priceMultiplier, description } = body;

    await query(
      `UPDATE customer_groups 
       SET group_name = $1, price_multiplier = $2, description = $3
       WHERE id = $4`,
      [groupName, parseFloat(priceMultiplier), description || null, groupId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    // Kiểm tra có khách hàng không
    const checkCustomers = await query(
      'SELECT id FROM customers WHERE customer_group_id = $1 LIMIT 1',
      [groupId]
    );

    if (checkCustomers.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhóm đã có khách hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM customer_groups WHERE id = $1', [groupId]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
