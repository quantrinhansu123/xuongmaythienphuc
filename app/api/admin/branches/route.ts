import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền xem branches
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.branches', 'view');
    if (!hasPermission) {
      // Nếu không có quyền admin.branches nhưng đã đăng nhập, trả về chi nhánh của user
      if (currentUser) {
        const result = await query(
          `SELECT id, branch_code as "branchCode", branch_name as "branchName", 
                  address, phone, email, is_active as "isActive", created_at as "createdAt"
           FROM branches 
           WHERE id = $1`,
          [currentUser.branchId]
        );
        return NextResponse.json<ApiResponse>({
          success: true,
          data: result.rows
        });
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem chi nhánh'
      }, { status: 403 });
    }

    // ADMIN hoặc có quyền admin.branches: xem tất cả
    const result = await query(
      `SELECT id, branch_code as "branchCode", branch_name as "branchName", 
              address, phone, email, is_active as "isActive", created_at as "createdAt"
       FROM branches 
       ORDER BY id`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo branch
    const { hasPermission, error } = await requirePermission('admin.branches', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo chi nhánh'
      }, { status: 403 });
    }

    const body = await request.json();
    let { branchCode, branchName, address, phone, email } = body;

    if (!branchName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền tên chi nhánh'
      }, { status: 400 });
    }

    // Tự sinh mã chi nhánh nếu không có
    if (!branchCode) {
      const codeResult = await query(
        `SELECT 'CN' || LPAD((COALESCE(MAX(CASE 
           WHEN branch_code ~ '^CN[0-9]+$' 
           THEN SUBSTRING(branch_code FROM 3)::INTEGER 
           ELSE 0 
         END), 0) + 1)::TEXT, 3, '0') as code
         FROM branches`
      );
      branchCode = codeResult.rows[0].code;
    }

    const result = await query(
      `INSERT INTO branches (branch_code, branch_name, address, phone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, branch_code as "branchCode", branch_name as "branchName"`,
      [branchCode, branchName, address, phone, email]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo chi nhánh thành công'
    });

  } catch (error: any) {
    console.error('Create branch error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã chi nhánh đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
