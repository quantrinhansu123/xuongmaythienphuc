import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('inventory.balance', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem chi tiết giao dịch'
      }, { status: 403 });
    }

    const { id } = await params;

    // Lấy thông tin giao dịch
    const transactionResult = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
        it.transaction_type as "transactionType",
        it.from_warehouse_id as "fromWarehouseId",
        w1.warehouse_name as "fromWarehouseName",
        it.to_warehouse_id as "toWarehouseId",
        w2.warehouse_name as "toWarehouseName",
        it.status,
        it.notes,
        it.created_by as "createdBy",
        u1.full_name as "createdByName",
        it.created_at as "createdAt",
        it.approved_by as "approvedBy",
        u2.full_name as "approvedByName",
        it.approved_at as "approvedAt",
        it.completed_at as "completedAt"
       FROM inventory_transactions it
       LEFT JOIN warehouses w1 ON w1.id = it.from_warehouse_id
       LEFT JOIN warehouses w2 ON w2.id = it.to_warehouse_id
       LEFT JOIN users u1 ON u1.id = it.created_by
       LEFT JOIN users u2 ON u2.id = it.approved_by
       WHERE it.id = $1`,
      [id]
    );

    if (transactionResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy giao dịch'
      }, { status: 404 });
    }

    // Lấy chi tiết hàng hóa
    const detailsResult = await query(
      `SELECT 
        itd.id,
        COALESCE(m.material_code, p.product_code) as "itemCode",
        COALESCE(m.material_name, p.product_name) as "itemName",
        CASE 
          WHEN m.id IS NOT NULL THEN 'NVL'
          ELSE 'THANH_PHAM'
        END as "itemType",
        itd.quantity,
        COALESCE(m.unit, p.unit) as unit,
        itd.unit_price as "unitPrice",
        itd.total_amount as "totalAmount",
        itd.notes
       FROM inventory_transaction_details itd
       LEFT JOIN materials m ON m.id = itd.material_id
       LEFT JOIN products p ON p.id = itd.product_id
       WHERE itd.transaction_id = $1
       ORDER BY itd.id`,
      [id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        transaction: transactionResult.rows[0],
        details: detailsResult.rows
      }
    });

  } catch (error) {
    console.error('Get transaction detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
