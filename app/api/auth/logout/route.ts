import { getCurrentUser, removeAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Lấy thông tin user hiện tại để vô hiệu hóa session
    const user = await getCurrentUser();
    
    if (user?.sessionToken) {
      // Vô hiệu hóa session trong database
      await query(
        `UPDATE user_sessions SET is_active = false WHERE session_token = $1`,
        [user.sessionToken]
      );
    }
    
    await removeAuthCookie();
    
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
