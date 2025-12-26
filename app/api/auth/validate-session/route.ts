import { getCurrentUser, removeAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextResponse } from 'next/server';

// GET: Kiểm tra session hiện tại còn hợp lệ không
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chưa đăng nhập'
      }, { status: 401 });
    }

    // Token cũ không có sessionToken - cho phép tiếp tục (tương thích ngược)
    // User sẽ cần đăng nhập lại khi token hết hạn để có sessionToken mới
    if (!user.sessionToken) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { valid: true, legacy: true }
      });
    }

    // Kiểm tra session trong database
    let result;
    try {
      result = await query(
        `SELECT s.*, u.employment_status, u.is_active as user_active
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.session_token = $1`,
        [user.sessionToken]
      );
    } catch (dbError: any) {
      // Bảng user_sessions chưa tồn tại - cho phép tiếp tục
      if (dbError?.code === '42P01') { // undefined_table
        return NextResponse.json<ApiResponse>({
          success: true,
          data: { valid: true, legacy: true }
        });
      }
      throw dbError;
    }

    if (result.rows.length === 0) {
      // Session không tồn tại trong DB - có thể do chưa migrate
      // Cho phép tiếp tục nhưng log warning
      console.warn('Session token not found in database:', user.sessionToken?.substring(0, 8));
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { valid: true, legacy: true }
      });
    }

    const session = result.rows[0];

    // Kiểm tra user đã nghỉ việc
    if (session.employment_status === 'RESIGNED') {
      await removeAuthCookie();
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa do nhân viên đã nghỉ việc'
      }, { status: 403 });
    }

    // Kiểm tra user bị vô hiệu hóa
    if (!session.user_active) {
      await removeAuthCookie();
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      }, { status: 403 });
    }

    // Kiểm tra session đã bị vô hiệu hóa (bị đăng xuất từ thiết bị khác hoặc đổi mật khẩu)
    if (!session.is_active) {
      await removeAuthCookie();
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Phiên đăng nhập đã bị vô hiệu hóa. Vui lòng đăng nhập lại.'
      }, { status: 401 });
    }

    // Kiểm tra session đã hết hạn
    if (new Date(session.expires_at) < new Date()) {
      await removeAuthCookie();
      await query(
        `UPDATE user_sessions SET is_active = false WHERE session_token = $1`,
        [user.sessionToken]
      );
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      }, { status: 401 });
    }

    // Cập nhật last_activity_at
    await query(
      `UPDATE user_sessions SET last_activity_at = NOW() WHERE session_token = $1`,
      [user.sessionToken]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { valid: true }
    });

  } catch (error) {
    console.error('Validate session error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
