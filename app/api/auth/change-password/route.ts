import { getCurrentUser, removeAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// POST: Đổi mật khẩu và vô hiệu hóa tất cả sessions
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chưa đăng nhập'
      }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin'
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu mới không khớp'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      }, { status: 400 });
    }

    // Kiểm tra mật khẩu hiện tại
    const userResult = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy người dùng'
      }, { status: 404 });
    }

    // Tạm thời so sánh trực tiếp (nên dùng bcrypt trong production)
    if (userResult.rows[0].password_hash !== currentPassword) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      }, { status: 400 });
    }

    // Cập nhật mật khẩu mới
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newPassword, user.id]
    );

    // Vô hiệu hóa TẤT CẢ sessions của user (bao gồm cả session hiện tại)
    await query(
      `UPDATE user_sessions SET is_active = false WHERE user_id = $1`,
      [user.id]
    );

    // Xóa cookie hiện tại
    await removeAuthCookie();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
