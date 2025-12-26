import { generateSessionToken, generateToken, getSessionExpiryTime, setAuthCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      }, { status: 400 });
    }

    // Tìm user với kiểm tra trạng thái làm việc
    const result = await query(
      `SELECT u.*, r.role_code 
       FROM users u 
       JOIN roles r ON r.id = u.role_id 
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên đăng nhập không tồn tại hoặc tài khoản đã bị vô hiệu hóa'
      }, { status: 401 });
    }

    const user = result.rows[0];

    // Kiểm tra nhân viên đã nghỉ việc
    if (user.employment_status === 'RESIGNED') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa do nhân viên đã nghỉ việc'
      }, { status: 403 });
    }

    // Kiểm tra password (tạm thời so sánh trực tiếp)
    if (user.password_hash !== password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mật khẩu không đúng'
      }, { status: 401 });
    }

    // Lấy thông tin thiết bị từ request
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown';
    const deviceName = parseDeviceName(userAgent);

    // Tạo session token duy nhất
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiryTime();

    // Lưu session vào database (trigger sẽ tự động vô hiệu hóa session cũ nếu > 5)
    // Nếu bảng chưa tồn tại, bỏ qua và tiếp tục đăng nhập
    let sessionSaved = false;
    try {
      await query(
        `INSERT INTO user_sessions (user_id, session_token, device_info, device_name, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, sessionToken, userAgent, deviceName, ipAddress, expiresAt]
      );
      sessionSaved = true;
    } catch (dbError: any) {
      // Bảng user_sessions chưa tồn tại - bỏ qua, vẫn cho đăng nhập
      if (dbError?.code === '42P01') { // undefined_table
        console.warn('user_sessions table not found, skipping session tracking');
      } else {
        throw dbError;
      }
    }

    // Tạo JWT token với session token (chỉ thêm nếu đã lưu vào DB)
    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      branchId: user.branch_id,
      roleId: user.role_id,
      roleCode: user.role_code,
      sessionToken: sessionSaved ? sessionToken : undefined,
    });

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          branchId: user.branch_id,
          roleCode: user.role_code,
        }
      },
      message: 'Đăng nhập thành công'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// Parse device name từ User-Agent
function parseDeviceName(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android.*?;\s*([^;)]+)/);
    return match ? match[1].trim() : 'Android Device';
  }
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}
