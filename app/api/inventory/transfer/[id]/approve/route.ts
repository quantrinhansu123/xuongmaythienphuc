import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.transfer', 'edit');
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
      `SELECT id, status, from_warehouse_id, to_warehouse_id FROM inventory_transactions WHERE id = $1`,
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

    const fromWarehouseId = transCheck.rows[0].from_warehouse_id;
    const toWarehouseId = transCheck.rows[0].to_warehouse_id;

    // Lấy chi tiết phiếu
    const details = await query(
      `SELECT product_id, material_id, quantity, unit_price FROM inventory_transaction_details WHERE transaction_id = $1`,
      [transactionId]
    );

    // Kiểm tra và cập nhật tồn kho
    for (const item of details.rows) {
      // Kiểm tra tồn kho kho xuất
      const fromBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [fromWarehouseId, item.product_id, item.material_id]
      );

      if (fromBalance.rows.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Không tìm thấy tồn kho trong kho xuất'
        }, { status: 400 });
      }

      const currentQty = parseFloat(String(fromBalance.rows[0].quantity));
      const requestQty = parseFloat(String(item.quantity));

      console.log(`[Transfer Approve] Item: productId=${item.product_id}, materialId=${item.material_id}`);
      console.log(`[Transfer Approve] Current: ${currentQty}, Request: ${requestQty}`);

      if (currentQty < requestQty) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Số lượng tồn kho không đủ. Tồn: ${currentQty}, Yêu cầu: ${requestQty}`
        }, { status: 400 });
      }

      // Trừ tồn kho kho xuất - dùng số đã parse để đảm bảo đúng kiểu
      await query(
        `UPDATE inventory_balances 
         SET quantity = quantity - $1::DECIMAL, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [requestQty, fromBalance.rows[0].id]
      );

      console.log(`[Transfer Approve] Subtracted ${requestQty} from warehouse ${fromWarehouseId}`);

      // Cộng tồn kho kho nhập
      const toBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [toWarehouseId, item.product_id, item.material_id]
      );

      if (toBalance.rows.length > 0) {
        // Cộng thêm vào tồn kho
        await query(
          `UPDATE inventory_balances 
           SET quantity = quantity + $1::DECIMAL, last_updated = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [requestQty, toBalance.rows[0].id]
        );
        console.log(`[Transfer Approve] Added ${requestQty} to existing balance in warehouse ${toWarehouseId}`);
      } else {
        // Tạo mới
        await query(
          `INSERT INTO inventory_balances (warehouse_id, product_id, material_id, quantity)
           VALUES ($1, $2, $3, $4::DECIMAL)`,
          [toWarehouseId, item.product_id, item.material_id, requestQty]
        );
        console.log(`[Transfer Approve] Created new balance with ${requestQty} in warehouse ${toWarehouseId}`);
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
      message: 'Duyệt phiếu luân chuyển kho thành công'
    });

  } catch (error) {
    console.error('Approve transfer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
