import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Cập nhật user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền chỉnh sửa user
    const { hasPermission, error } = await requirePermission('admin.users', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, branchId, roleId, isActive, employmentStatus } = body;

    const result = await query(
      `UPDATE users 
       SET full_name = $1, email = $2, phone = $3, branch_id = $4, role_id = $5, is_active = $6,
           employment_status = COALESCE($8, employment_status)
       WHERE id = $7
       RETURNING id, user_code as "userCode", username, full_name as "fullName", employment_status as "employmentStatus"`,
      [fullName, email, phone, branchId, roleId, isActive, id, employmentStatus]
    );

    // Nếu set nhân viên nghỉ việc, vô hiệu hóa tất cả sessions
    if (employmentStatus === 'RESIGNED') {
      await query(
        `UPDATE user_sessions SET is_active = false WHERE user_id = $1`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy người dùng'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE - Xóa user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa user
    const { hasPermission, error } = await requirePermission('admin.users', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa người dùng'
      }, { status: 403 });
    }

    const { id } = await params;

    // Thử xóa user, nếu có lỗi foreign key sẽ bắt ở catch
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy người dùng'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa người dùng thành công'
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    console.error('Error code:', error?.code);
    console.error('Error detail:', error?.detail);
    
    // Xử lý lỗi foreign key constraint
    if (error?.code === '23503' || error?.constraint) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa người dùng này vì đang có dữ liệu liên quan (đơn hàng, giao dịch kho, v.v.). Bạn có thể khóa tài khoản thay vì xóa.'
      }, { status: 400 });
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: error?.message || 'Lỗi server khi xóa người dùng'
    }, { status: 500 });
  }
}
