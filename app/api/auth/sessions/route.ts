import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET: Lấy danh sách phiên đăng nhập của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chưa đăng nhập'
      }, { status: 401 });
    }

    // Lấy danh sách sessions của user
    const result = await query(
      `SELECT id, device_name, device_info, ip_address, is_active, 
              created_at, expires_at, last_activity_at,
              CASE WHEN session_token = $2 THEN true ELSE false END as is_current
       FROM user_sessions 
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [user.id, user.sessionToken]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        sessions: result.rows,
        currentSessionToken: user.sessionToken
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE: Đăng xuất một hoặc nhiều thiết bị khác
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chưa đăng nhập'
      }, { status: 401 });
    }

    const { sessionIds, logoutAll } = await request.json();

    if (logoutAll) {
      // Đăng xuất tất cả thiết bị khác (trừ thiết bị hiện tại)
      await query(
        `UPDATE user_sessions 
         SET is_active = false 
         WHERE user_id = $1 AND session_token != $2 AND is_active = true`,
        [user.id, user.sessionToken]
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Đã đăng xuất tất cả thiết bị khác'
      });
    }

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn thiết bị cần đăng xuất'
      }, { status: 400 });
    }

    // Đăng xuất các thiết bị được chọn (không cho phép đăng xuất thiết bị hiện tại qua API này)
    await query(
      `UPDATE user_sessions 
       SET is_active = false 
       WHERE user_id = $1 AND id = ANY($2) AND session_token != $3`,
      [user.id, sessionIds, user.sessionToken]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đã đăng xuất các thiết bị được chọn'
    });

  } catch (error) {
    console.error('Delete sessions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
