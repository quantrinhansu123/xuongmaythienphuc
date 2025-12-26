import { hasPermission, validateApiKey } from '@/lib/api-key';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: Lấy danh sách users
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const roleCode = searchParams.get('roleCode');
    const isActive = searchParams.get('isActive');

    let sql = `
      SELECT 
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
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (branchId) {
      sql += ` AND u.branch_id = $${paramIndex++}`;
      params.push(branchId);
    }

    if (roleCode) {
      sql += ` AND r.role_code = $${paramIndex++}`;
      params.push(roleCode);
    }

    if (isActive !== null && isActive !== undefined) {
      sql += ` AND u.is_active = $${paramIndex++}`;
      params.push(isActive === 'true');
    }

    sql += ' ORDER BY u.id ASC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: {
        users: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Public get users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}
