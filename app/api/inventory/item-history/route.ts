import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem lịch sử'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('itemCode');
    const warehouseId = searchParams.get('warehouseId');

    if (!itemCode) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Thiếu itemCode'
      }, { status: 400 });
    }

    // Lấy lịch sử giao dịch của sản phẩm/NVL theo itemCode
    let whereClause = `WHERE (m.material_code = $1 OR p.product_code = $1)`;
    const params: (string | number)[] = [itemCode];
    let paramIndex = 2;

    // Lọc theo kho nếu có
    if (warehouseId) {
      whereClause += ` AND (it.from_warehouse_id = $${paramIndex} OR it.to_warehouse_id = $${paramIndex})`;
      params.push(parseInt(warehouseId));
      paramIndex++;
    }

    // Data segregation
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ` AND (w1.branch_id = $${paramIndex} OR w2.branch_id = $${paramIndex})`;
      params.push(currentUser.branchId);
    }

    const result = await query(
      `SELECT 
        itd.id,
        it.transaction_code as "transactionCode",
        it.transaction_type as "transactionType",
        itd.quantity,
        itd.unit_price as "unitPrice",
        itd.total_amount as "totalAmount",
        it.notes,
        it.created_at as "createdAt",
        w1.warehouse_name as "fromWarehouseName",
        w2.warehouse_name as "toWarehouseName"
       FROM inventory_transaction_details itd
       JOIN inventory_transactions it ON it.id = itd.transaction_id
       LEFT JOIN materials m ON m.id = itd.material_id
       LEFT JOIN products p ON p.id = itd.product_id
       LEFT JOIN warehouses w1 ON w1.id = it.from_warehouse_id
       LEFT JOIN warehouses w2 ON w2.id = it.to_warehouse_id
       ${whereClause}
       ORDER BY it.created_at DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get item history error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
