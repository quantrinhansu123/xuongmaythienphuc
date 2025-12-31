import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.customer-groups', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    // Filter theo chi nhánh (trừ ADMIN)
    let whereClause = '';
    const params: any[] = [];

    if (user.roleCode !== 'ADMIN') {
      whereClause = 'WHERE cg.branch_id = $1';
      params.push(user.branchId);
    }

    const result = await query(
      `SELECT 
        cg.id,
        cg.group_code as "groupCode",
        cg.group_name as "groupName",
        cg.price_multiplier as "priceMultiplier",
        cg.description,
        cg.branch_id as "branchId",
        b.branch_name as "branchName",
        cg.created_at as "createdAt",
        COUNT(c.id)::int as "customerCount"
       FROM customer_groups cg
       LEFT JOIN customers c ON c.customer_group_id = cg.id
       LEFT JOIN branches b ON b.id = cg.branch_id
       ${whereClause}
       GROUP BY cg.id, cg.group_code, cg.group_name, cg.price_multiplier, cg.description, cg.branch_id, b.branch_name, cg.created_at
       ORDER BY cg.group_name`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get customer groups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.customer-groups', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhóm khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { groupCode, groupName, priceMultiplier, description, branchId } = body;

    // Xác định branch_id: ADMIN có thể chọn, user khác dùng branch của mình
    const finalBranchId = user.roleCode === 'ADMIN' && branchId ? branchId : user.branchId;

    // Kiểm tra mã nhóm trùng trong cùng chi nhánh
    const checkResult = await query(
      'SELECT id FROM customer_groups WHERE group_code = $1 AND branch_id = $2',
      [groupCode, finalBranchId]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã nhóm đã tồn tại trong chi nhánh này'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO customer_groups (group_code, group_name, price_multiplier, description, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [groupCode, groupName, parseFloat(priceMultiplier || 1), description || null, finalBranchId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
