import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.customer-groups', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    // Filter theo chi nhánh (trừ ADMIN)
    let whereClause = 'WHERE cg.id = $1';
    const params_query: any[] = [groupId];

    if (user.roleCode !== 'ADMIN') {
      whereClause += ' AND cg.branch_id = $2';
      params_query.push(user.branchId);
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
       GROUP BY cg.id, cg.group_code, cg.group_name, cg.price_multiplier, cg.description, cg.branch_id, b.branch_name, cg.created_at`,
      params_query
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy nhóm khách hàng'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.customer-groups', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { groupName, priceMultiplier, description, categoryPrices } = body;

    // Kiểm tra quyền truy cập nhóm (theo chi nhánh)
    if (user.roleCode !== 'ADMIN') {
      const checkAccess = await query(
        'SELECT id FROM customer_groups WHERE id = $1 AND branch_id = $2',
        [groupId, user.branchId]
      );
      if (checkAccess.rows.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không có quyền sửa nhóm này'
        }, { status: 403 });
      }
    }

    // Cập nhật thông tin nhóm
    await query(
      `UPDATE customer_groups 
       SET group_name = $1, price_multiplier = $2, description = $3
       WHERE id = $4`,
      [groupName, parseFloat(priceMultiplier), description || null, groupId]
    );

    // Cập nhật hệ số giá theo danh mục (nếu có)
    if (Array.isArray(categoryPrices) && categoryPrices.length > 0) {
      // Xóa các giá cũ
      await query(
        'DELETE FROM customer_group_category_prices WHERE customer_group_id = $1',
        [groupId]
      );

      // Thêm các hệ số giá mới
      for (const item of categoryPrices) {
        if (item.categoryId && item.priceMultiplier !== undefined) {
          await query(
            `INSERT INTO customer_group_category_prices (customer_group_id, category_id, price_multiplier)
             VALUES ($1, $2, $3)`,
            [groupId, item.categoryId, parseFloat(item.priceMultiplier)]
          );
        }
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.customer-groups', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhóm khách hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.id);

    // Kiểm tra quyền truy cập nhóm (theo chi nhánh)
    if (user.roleCode !== 'ADMIN') {
      const checkAccess = await query(
        'SELECT id FROM customer_groups WHERE id = $1 AND branch_id = $2',
        [groupId, user.branchId]
      );
      if (checkAccess.rows.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không có quyền xóa nhóm này'
        }, { status: 403 });
      }
    }

    // Kiểm tra có khách hàng không
    const checkCustomers = await query(
      'SELECT id FROM customers WHERE customer_group_id = $1 LIMIT 1',
      [groupId]
    );

    if (checkCustomers.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhóm đã có khách hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM customer_groups WHERE id = $1', [groupId]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete customer group error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
