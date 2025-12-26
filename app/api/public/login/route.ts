import { hasPermission, validateApiKey } from '@/lib/api-key';
import { generateSessionToken, generateToken, getSessionExpiryTime } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra API key
    const apiKey = request.headers.get('x-api-key') || '';
    const { valid, error, keyInfo } = await validateApiKey(apiKey);
    
    if (!valid || !keyInfo) {
      return NextResponse.json({
        success: false,
        error: error || 'Invalid API key'
      }, { status: 401 });
    }

    // Kiểm tra quyền login
    if (!hasPermission(keyInfo, 'login')) {
      return NextResponse.json({
        success: false,
        error: 'API key does not have login permission'
      }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 });
    }

    // Tìm user
    const result = await query(
      `SELECT u.*, r.role_code, r.role_name, b.branch_name
       FROM users u 
       JOIN roles r ON r.id = u.role_id 
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or account is disabled'
      }, { status: 401 });
    }

    const user = result.rows[0];

    // Kiểm tra nhân viên đã nghỉ việc
    if (user.employment_status === 'RESIGNED') {
      return NextResponse.json({
        success: false,
        error: 'Account is disabled (employee resigned)'
      }, { status: 403 });
    }

    // Kiểm tra password
    if (user.password_hash !== password) {
      return NextResponse.json({
        success: false,
        error: 'Invalid password'
      }, { status: 401 });
    }

    // Tạo session
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiryTime();

    // Lưu session (nếu bảng tồn tại)
    try {
      const userAgent = request.headers.get('user-agent') || 'API Client';
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'Unknown';

      await query(
        `INSERT INTO user_sessions (user_id, session_token, device_info, device_name, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, sessionToken, userAgent, 'API Client', ipAddress, expiresAt]
      );
    } catch (e) {
      // Bỏ qua nếu bảng chưa tồn tại
    }

    // Tạo JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      branchId: user.branch_id,
      roleId: user.role_id,
      roleCode: user.role_code,
      sessionToken: sessionToken,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          userCode: user.user_code,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          branchId: user.branch_id,
          branchName: user.branch_name,
          roleId: user.role_id,
          roleCode: user.role_code,
          roleName: user.role_name,
        }
      }
    });

  } catch (error) {
    console.error('Public login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}
