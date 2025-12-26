import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem tồn kho
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // Nếu showAll=true thì hiển thị tất cả kho (dùng cho luân chuyển khác chi nhánh)
    const showAll = searchParams.get('showAll') === 'true';

    // Data segregation - Admin xem tất cả, user chỉ xem kho thuộc chi nhánh (trừ khi showAll=true)
    let whereClause = 'WHERE w.is_active = true';
    const params: any[] = [];
    
    if (!showAll && currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ' AND w.branch_id = $1';
      params.push(currentUser.branchId);
    }

    const result = await query(
      `SELECT 
        w.id, 
        w.warehouse_code as "warehouseCode", 
        w.warehouse_name as "warehouseName",
        w.warehouse_type as "warehouseType",
        w.branch_id as "branchId",
        b.branch_name as "branchName"
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w.branch_id
       ${whereClause}
       ORDER BY b.branch_name, w.warehouse_type, w.warehouse_name`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get inventory warehouses error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
