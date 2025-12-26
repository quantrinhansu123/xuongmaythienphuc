import { hasPermission, validateApiKey } from '@/lib/api-key';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: Lấy thông tin một user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Kiểm tra quyền users
    if (!hasPermission(keyInfo, 'users')) {
      return NextResponse.json({
        success: false,
        error: 'API key does not have users permission'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        u.id,
        u.user_code as "userCode",
        u.username,
        u.full_name as "fullName",
        u.email,
        u.phone,
        u.branch_id as "branchId",
        b.branch_name as "branchName",
        u.role_id as "roleId",
        r.role_code as "roleCode",
        r.role_name as "roleName",
        u.is_active as "isActive",
        u.employment_status as "employmentStatus",
        u.created_at as "createdAt"
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { user: result.rows[0] }
    });

  } catch (error) {
    console.error('Public get user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}
