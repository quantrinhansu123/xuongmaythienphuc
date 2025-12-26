import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền duyệt phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu
    const transCheck = await query(
      `SELECT id, status, from_warehouse_id FROM inventory_transactions WHERE id = $1`,
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

    // Lấy chi tiết
    const details = await query(
      `SELECT product_id, material_id, quantity FROM inventory_transaction_details WHERE transaction_id = $1`,
      [transactionId]
    );

    // Trừ tồn kho
    for (const item of details.rows) {
      console.log(`🔍 [Export Approve] Checking balance for:`, {
        warehouseId: fromWarehouseId,
        productId: item.product_id,
        materialId: item.material_id,
        quantity: item.quantity
      });

      const existingBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [fromWarehouseId, item.product_id, item.material_id]
      );

      console.log(`📦 [Export Approve] Found balance:`, existingBalance.rows);

      // Debug: Kiểm tra tất cả balance trong kho này
      if (existingBalance.rows.length === 0) {
        const allBalances = await query(
          `SELECT id, warehouse_id, product_id, material_id, quantity 
           FROM inventory_balances 
           WHERE warehouse_id = $1 
           LIMIT 10`,
          [fromWarehouseId]
        );
        console.log(`⚠️ [Export Approve] All balances in warehouse ${fromWarehouseId}:`, allBalances.rows);
      }

      if (existingBalance.rows.length === 0) {
        // Lấy thêm thông tin để debug
        const itemInfo = item.product_id 
          ? await query('SELECT product_code, product_name FROM products WHERE id = $1', [item.product_id])
          : await query('SELECT material_code, material_name FROM materials WHERE id = $1', [item.material_id]);
        
        const itemName = itemInfo.rows[0]?.product_name || itemInfo.rows[0]?.material_name || 'Unknown';
        const itemCode = itemInfo.rows[0]?.product_code || itemInfo.rows[0]?.material_code || 'Unknown';
        
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Không tìm thấy tồn kho cho ${itemCode} - ${itemName}`
        }, { status: 400 });
      }

      // Debug kiểu dữ liệu
      console.log(`🔢 [Export Approve] Raw quantity types:`, {
        balanceQty: existingBalance.rows[0].quantity,
        balanceQtyType: typeof existingBalance.rows[0].quantity,
        itemQty: item.quantity,
        itemQtyType: typeof item.quantity
      });

      const currentQty = parseFloat(String(existingBalance.rows[0].quantity));
      const requestQty = parseFloat(String(item.quantity));

      console.log(`🔢 [Export Approve] Parsed quantities:`, {
        currentQty,
        requestQty,
        isCurrentNaN: isNaN(currentQty),
        isRequestNaN: isNaN(requestQty)
      });

      if (isNaN(currentQty) || isNaN(requestQty)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Lỗi dữ liệu số lượng không hợp lệ. Tồn kho: ${existingBalance.rows[0].quantity}, Yêu cầu: ${item.quantity}`
        }, { status: 400 });
      }

      if (currentQty < requestQty) {
        // Lấy thêm thông tin để debug
        const itemInfo = item.product_id 
          ? await query('SELECT product_code, product_name FROM products WHERE id = $1', [item.product_id])
          : await query('SELECT material_code, material_name FROM materials WHERE id = $1', [item.material_id]);
        
        const itemName = itemInfo.rows[0]?.product_name || itemInfo.rows[0]?.material_name || 'Unknown';
        const itemCode = itemInfo.rows[0]?.product_code || itemInfo.rows[0]?.material_code || 'Unknown';
        
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Số lượng tồn kho không đủ cho ${itemCode} - ${itemName}. Tồn: ${currentQty}, Yêu cầu: ${requestQty}`
        }, { status: 400 });
      }

      // Trừ tồn kho
      await query(
        `UPDATE inventory_balances 
         SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity, existingBalance.rows[0].id]
      );
    }

    // Cập nhật trạng thái
    await query(
      `UPDATE inventory_transactions 
       SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [currentUser.id, transactionId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Duyệt phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Approve export error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
