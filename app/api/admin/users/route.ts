import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách users
export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem users
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.users', 'view');

    console.log('[Get Users API] Permission check result:', { hasPermission, error });
    console.log('[Get Users API] Current user:', currentUser);

    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem người dùng'
      }, { status: 403 });
    }

    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy thông tin user'
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const departmentIdVal = searchParams.get('departmentId');
    const departmentId = departmentIdVal && departmentIdVal !== 'all' ? parseInt(departmentIdVal) : null;
    const offset = (page - 1) * limit;

    console.log('[Get Users] Current user:', {
      id: currentUser.id,
      username: currentUser.username,
      roleCode: currentUser.roleCode,
      branchId: currentUser.branchId
    });

    // ADMIN xem toàn bộ users, user khác chỉ xem users trong chi nhánh của mình
    let usersQuery: string;
    let countQuery: string;
    let queryParams: any[];
    let countParams: any[];

    // Extend query logic
    const deptFilterClause = departmentId ? ` AND u.department_id = $${currentUser.roleCode !== 'ADMIN' ? '4' : '3'} ` : '';

    if (currentUser.roleCode !== 'ADMIN') {
      // User không phải ADMIN chỉ xem users trong chi nhánh của mình
      console.log('[Get Users] Filtering by branch:', currentUser.branchId);

      usersQuery = `
        SELECT 
          u.id, u.user_code as "userCode", u.username, u.full_name as "fullName",
          u.email, u.phone, u.branch_id as "branchId", u.role_id as "roleId",
          u.department_id as "departmentId", d.department_name as "departmentName",
          u.is_active as "isActive", u.created_at as "createdAt",
          u.is_default_password as "isDefaultPassword",
          b.branch_name as "branchName", r.role_name as "roleName", r.role_code as "roleCode",
          (
            SELECT json_agg(json_build_object('id', b2.id, 'branchName', b2.branch_name, 'branchCode', b2.branch_code))
            FROM user_branches ub
            JOIN branches b2 ON b2.id = ub.branch_id
            WHERE ub.user_id = u.id
          ) as branches
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id IN (
            SELECT user_id FROM user_branches WHERE branch_id = $1
        )
        ${departmentId ? ` AND u.department_id = $4 ` : ''}
        ORDER BY u.id DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [currentUser.branchId, limit, offset];
      if (departmentId) queryParams.push(departmentId);

      countQuery = `
        SELECT COUNT(DISTINCT u.id) 
        FROM users u 
        JOIN user_branches ub ON ub.user_id = u.id
        WHERE ub.branch_id = $1
        ${departmentId ? ` AND u.department_id = $2 ` : ''}
        `;
      countParams = [currentUser.branchId];
      if (departmentId) countParams.push(departmentId);

    } else {
      // ADMIN xem tất cả users
      console.log('[Get Users] ADMIN - showing all users');

      usersQuery = `
        SELECT 
          u.id, u.user_code as "userCode", u.username, u.full_name as "fullName",
          u.email, u.phone, u.branch_id as "branchId", u.role_id as "roleId",
          u.department_id as "departmentId", d.department_name as "departmentName",
          u.is_active as "isActive", u.created_at as "createdAt",
          u.is_default_password as "isDefaultPassword",
          b.branch_name as "branchName", r.role_name as "roleName", r.role_code as "roleCode",
          (
            SELECT json_agg(json_build_object('id', b2.id, 'branchName', b2.branch_name, 'branchCode', b2.branch_code))
            FROM user_branches ub
            JOIN branches b2 ON b2.id = ub.branch_id
            WHERE ub.user_id = u.id
          ) as branches
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE 1=1
        ${departmentId ? ` AND u.department_id = $3 ` : ''}
        ORDER BY u.id DESC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [limit, offset];
      if (departmentId) queryParams.push(departmentId);

      countQuery = `SELECT COUNT(*) FROM users u WHERE 1=1 ${departmentId ? ` AND department_id = $1 ` : ''}`;
      countParams = [];
      if (departmentId) countParams.push(departmentId);
    }

    console.log('[Get Users] Executing query with params:', queryParams);

    const result = await query(usersQuery, queryParams);
    console.log('[Get Users] Query executed, rows:', result.rows.length);

    const countResult = await query(countQuery, countParams);
    console.log('[Get Users] Count result:', countResult.rows[0].count);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      }
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server: ' + error.message
    }, { status: 500 });
  }
}

// POST - Tạo user mới
export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo user
    const { hasPermission, error } = await requirePermission('admin.users', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo người dùng'
      }, { status: 403 });
    }

    const body = await request.json();
    let { userCode, username, password, fullName, email, phone, branchIds, departmentId, roleId } = body;

    // Validation
    if (!username || !password || !fullName || !roleId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra username đã tồn tại
    const checkUser = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (checkUser.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên đăng nhập đã tồn tại'
      }, { status: 400 });
    }

    // Tự sinh mã nhân viên nếu không có
    if (!userCode) {
      const codeResult = await query(
        `SELECT 'NV' || LPAD((COALESCE(MAX(CASE 
           WHEN user_code ~ '^NV[0-9]+$' 
           THEN SUBSTRING(user_code FROM 3)::INTEGER 
           ELSE 0 
         END), 0) + 1)::TEXT, 4, '0') as code
         FROM users`
      );
      userCode = codeResult.rows[0].code;
    }

    // Xác định branchId chính (lấy cái đầu tiên trong list hoặc null)
    // Để tương thích ngược, ta vẫn lưu 1 branchId vào bảng users
    const primaryBranchId = (branchIds && branchIds.length > 0) ? branchIds[0] : null;

    // Tạo user mới
    const result = await query(
      `INSERT INTO users (user_code, username, password_hash, full_name, email, phone, branch_id, department_id, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_code as "userCode", username, full_name as "fullName"`,
      [userCode, username, password, fullName, email, phone, primaryBranchId, departmentId, roleId]
    );

    const newUser = result.rows[0];

    // Insert user_branches
    if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
      const values = branchIds.map((bid: number) => `(${newUser.id}, ${bid}, ${bid === primaryBranchId})`).join(',');
      await query(`
        INSERT INTO user_branches (user_id, branch_id, is_primary)
        VALUES ${values}
      `);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo người dùng thành công'
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
