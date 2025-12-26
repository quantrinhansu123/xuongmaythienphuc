import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { customerCode, customerName, phone, email, address, customerGroupId, isActive } = body;

    // Validate số điện thoại nếu có
    if (phone) {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Số điện thoại không hợp lệ (phải là 10-11 số, bắt đầu bằng 0 hoặc +84)'
        }, { status: 400 });
      }
    }

    // Kiểm tra mã khách hàng trùng nếu có thay đổi
    if (customerCode) {
      const checkResult = await query(
        'SELECT id FROM customers WHERE customer_code = $1 AND id != $2',
        [customerCode, customerId]
      );

      if (checkResult.rows.length > 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Mã khách hàng đã tồn tại'
        }, { status: 400 });
      }
    }

    await query(
      `UPDATE customers 
       SET customer_code = COALESCE($1, customer_code),
           customer_name = $2, phone = $3, email = $4, address = $5,
           customer_group_id = $6, is_active = $7
       WHERE id = $8`,
      [customerCode || null, customerName, phone || null, email || null, address || null, customerGroupId || null, isActive !== undefined ? isActive : true, customerId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer error:', error);
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
        error: error || 'Không có quyền xóa khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const customerId = parseInt(resolvedParams.id);

    // Kiểm tra có đơn hàng không
    const checkOrders = await query(
      'SELECT id FROM orders WHERE customer_id = $1 LIMIT 1',
      [customerId]
    );

    if (checkOrders.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa khách hàng đã có đơn hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM customers WHERE id = $1', [customerId]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
