import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền duyệt phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu tồn tại và đang ở trạng thái PENDING
    const transCheck = await query(
      `SELECT id, status, to_warehouse_id FROM inventory_transactions WHERE id = $1`,
      [transactionId]
    );

    if (transCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu'
      }, { status: 404 });
    }

    if (transCheck.rows[0].status !== 'PENDING') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Phiếu không ở trạng thái chờ duyệt'
      }, { status: 400 });
    }

    const toWarehouseId = transCheck.rows[0].to_warehouse_id;

    // Lấy chi tiết phiếu
    const details = await query(
      `SELECT product_id, material_id, quantity FROM inventory_transaction_details WHERE transaction_id = $1`,
      [transactionId]
    );

    // Cập nhật tồn kho
    for (const item of details.rows) {
      const existingBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [toWarehouseId, item.product_id, item.material_id]
      );

      if (existingBalance.rows.length > 0) {
        // Cộng thêm vào tồn kho
        await query(
          `UPDATE inventory_balances 
           SET quantity = quantity + $1, last_updated = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [item.quantity, existingBalance.rows[0].id]
        );
      } else {
        // Tạo mới
        await query(
          `INSERT INTO inventory_balances (warehouse_id, product_id, material_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [toWarehouseId, item.product_id, item.material_id, item.quantity]
        );
      }
    }

    // Cập nhật trạng thái phiếu
    await query(
      `UPDATE inventory_transactions 
       SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [currentUser.id, transactionId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Duyệt phiếu nhập kho thành công'
    });

  } catch (error) {
    console.error('Approve import error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
