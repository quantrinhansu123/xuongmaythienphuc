import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET: Admin lấy danh sách sessions của một user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.users', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT id, device_name, device_info, ip_address, is_active, 
              created_at, expires_at, last_activity_at
       FROM user_sessions 
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { sessions: result.rows }
    });

  } catch (error: any) {
    // Bảng chưa tồn tại
    if (error?.code === '42P01') {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { sessions: [] }
      });
    }
    console.error('Get user sessions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE: Admin đăng xuất sessions của một user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.users', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa'
      }, { status: 403 });
    }

    const { id } = await params;
    const { sessionIds, logoutAll } = await request.json();

    if (logoutAll) {
      // Đăng xuất tất cả thiết bị của user
      await query(
        `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true`,
        [id]
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Đã đăng xuất tất cả thiết bị của người dùng'
      });
    }

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn thiết bị cần đăng xuất'
      }, { status: 400 });
    }

    // Đăng xuất các thiết bị được chọn
    await query(
      `UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND id = ANY($2)`,
      [id, sessionIds]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đã đăng xuất các thiết bị được chọn'
    });

  } catch (error) {
    console.error('Delete user sessions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
