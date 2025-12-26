import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu xuất kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    let whereClause = "WHERE it.transaction_type = 'XUAT'";
    const params: any[] = [];
    let paramIndex = 1;

    // Lọc theo kho cụ thể nếu có
    if (warehouseId) {
      whereClause += ` AND it.from_warehouse_id = $${paramIndex}`;
      params.push(parseInt(warehouseId));
      paramIndex++;
    }

    if (status && status !== 'ALL') {
      whereClause += ` AND it.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ` AND w.branch_id = $${paramIndex}`;
      params.push(currentUser.branchId);
      paramIndex++;
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const result = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
        it.from_warehouse_id as "fromWarehouseId",
        w.warehouse_name as "fromWarehouseName",
        it.status,
        it.notes,
        it.related_order_code as "relatedOrderCode",
        it.related_customer_name as "relatedCustomerName",
        it.created_by as "createdBy",
        u1.full_name as "createdByName",
        it.created_at as "createdAt",
        it.approved_by as "approvedBy",
        u2.full_name as "approvedByName",
        it.approved_at as "approvedAt",
        COALESCE((SELECT SUM(itd.total_amount) FROM inventory_transaction_details itd WHERE itd.transaction_id = it.id), 0) as "totalAmount"
       FROM inventory_transactions it
       LEFT JOIN warehouses w ON w.id = it.from_warehouse_id
       LEFT JOIN users u1 ON u1.id = it.created_by
       LEFT JOIN users u2 ON u2.id = it.approved_by
       ${whereClause}
       ORDER BY it.created_at DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    // Kiểm tra tồn kho cho các phiếu PENDING
    const pendingTransactions = result.rows.filter((t: any) => t.status === 'PENDING');
    const stockCheckPromises = pendingTransactions.map(async (trans: any) => {
      const detailsResult = await query(
        `SELECT 
          itd.id,
          itd.product_id,
          itd.material_id,
          itd.quantity as requested_qty,
          COALESCE(ib.quantity, 0) as stock_qty
         FROM inventory_transaction_details itd
         LEFT JOIN inventory_balances ib ON ib.warehouse_id = $1 
           AND ib.product_id IS NOT DISTINCT FROM itd.product_id 
           AND ib.material_id IS NOT DISTINCT FROM itd.material_id
         WHERE itd.transaction_id = $2`,
        [trans.fromWarehouseId, trans.id]
      );
      
      const hasInsufficientStock = detailsResult.rows.some(
        (d: any) => parseFloat(d.stock_qty) < parseFloat(d.requested_qty)
      );
      
      return { id: trans.id, hasInsufficientStock };
    });

    const stockCheckResults = await Promise.all(stockCheckPromises);
    const stockCheckMap = new Map(stockCheckResults.map(r => [r.id, r.hasInsufficientStock]));

    // Gắn thông tin tồn kho vào kết quả
    const dataWithStockInfo = result.rows.map((row: any) => ({
      ...row,
      hasInsufficientStock: stockCheckMap.get(row.id) || false
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: dataWithStockInfo
    });

  } catch (error) {
    console.error('Get export transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}


// POST - Tạo phiếu xuất kho
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.export', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu xuất kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { fromWarehouseId, notes, items, relatedOrderCode, relatedCustomerName } = body;

    if (!fromWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra quyền truy cập kho và loại kho
    const warehouseCheck = await query(
      'SELECT branch_id, warehouse_type FROM warehouses WHERE id = $1',
      [fromWarehouseId]
    );
    
    if (warehouseCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    const warehouseType = warehouseCheck.rows[0].warehouse_type;
    
    if (currentUser.roleCode !== 'ADMIN' && warehouseCheck.rows[0].branch_id !== currentUser.branchId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không có quyền xuất từ kho này'
      }, { status: 403 });
    }

    // Kiểm tra loại hàng hóa phù hợp với loại kho
    for (const item of items) {
      const isProduct = !!item.productId;
      const isMaterial = !!item.materialId;
      
      if (warehouseType === 'NVL' && isProduct) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho NVL chỉ chứa nguyên vật liệu, không có sản phẩm để xuất'
        }, { status: 400 });
      }
      
      if (warehouseType === 'THANH_PHAM' && isMaterial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho thành phẩm chỉ chứa sản phẩm, không có NVL để xuất'
        }, { status: 400 });
      }
    }

    // Tạo mã phiếu
    const codeResult = await query(
      `SELECT 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
       FROM inventory_transactions 
       WHERE transaction_code LIKE 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
    );
    const transactionCode = codeResult.rows[0].code;

    // Tạo phiếu xuất với thông tin đơn hàng
    const transResult = await query(
      `INSERT INTO inventory_transactions (transaction_code, transaction_type, from_warehouse_id, status, notes, created_by, related_order_code, related_customer_name)
       VALUES ($1, 'XUAT', $2, 'PENDING', $3, $4, $5, $6)
       RETURNING id`,
      [transactionCode, fromWarehouseId, notes, currentUser.id, relatedOrderCode || null, relatedCustomerName || null]
    );

    const transactionId = transResult.rows[0].id;

    // Kiểm tra tồn kho trước khi tạo phiếu
    for (const item of items) {
      const existingBalance = await query(
        `SELECT id, quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
        [fromWarehouseId, item.productId || null, item.materialId || null]
      );

      if (existingBalance.rows.length === 0) {
        await query('DELETE FROM inventory_transactions WHERE id = $1', [transactionId]);
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Không tìm thấy tồn kho cho mặt hàng`
        }, { status: 400 });
      }

      const currentQty = parseFloat(existingBalance.rows[0].quantity);
      const requestQty = parseFloat(item.quantity);

      if (currentQty < requestQty) {
        await query('DELETE FROM inventory_transactions WHERE id = $1', [transactionId]);
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Số lượng tồn kho không đủ. Tồn: ${currentQty}, Yêu cầu: ${requestQty}`
        }, { status: 400 });
      }
    }

    // Thêm chi tiết
    for (const item of items) {
      await query(
        `INSERT INTO inventory_transaction_details (transaction_id, product_id, material_id, quantity, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, item.productId || null, item.materialId || null, item.quantity, item.notes || null]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: transactionId, transactionCode },
      message: 'Tạo phiếu xuất kho thành công'
    });

  } catch (error) {
    console.error('Create export transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
