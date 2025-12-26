import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.transfer', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu chuyển kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    let whereClause = "WHERE it.transaction_type = 'CHUYEN'";
    const params: any[] = [];
    let paramIndex = 1;

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

    // Admin xem tất cả, user thường xem phiếu liên quan đến chi nhánh mình
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause += ` AND (w1.branch_id = $${paramIndex} OR w2.branch_id = $${paramIndex})`;
      params.push(currentUser.branchId);
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const result = await query(
      `SELECT 
        it.id,
        it.transaction_code as "transactionCode",
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
        COALESCE((SELECT SUM(itd.total_amount) FROM inventory_transaction_details itd WHERE itd.transaction_id = it.id), 0) as "totalAmount"
       FROM inventory_transactions it
       LEFT JOIN warehouses w1 ON w1.id = it.from_warehouse_id
       LEFT JOIN warehouses w2 ON w2.id = it.to_warehouse_id
       LEFT JOIN users u1 ON u1.id = it.created_by
       LEFT JOIN users u2 ON u2.id = it.approved_by
       ${whereClause}
       ORDER BY it.created_at DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get transfer transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST - Tạo phiếu luân chuyển kho (cho phép chuyển khác chi nhánh)
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.transfer', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu luân chuyển kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { fromWarehouseId, toWarehouseId, notes, items } = body;

    if (!fromWarehouseId || !toWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Kho xuất và kho nhập không được trùng nhau'
      }, { status: 400 });
    }

    // Kiểm tra kho xuất (không kiểm tra branch_id để cho phép chuyển khác chi nhánh)
    const fromWarehouseCheck = await query(
      'SELECT branch_id, warehouse_type, warehouse_name FROM warehouses WHERE id = $1',
      [fromWarehouseId]
    );
    
    if (fromWarehouseCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho xuất'
      }, { status: 404 });
    }

    const fromWarehouseType = fromWarehouseCheck.rows[0].warehouse_type;

    // Kiểm tra kho nhập
    const toWarehouseCheck = await query(
      'SELECT branch_id, warehouse_type, warehouse_name FROM warehouses WHERE id = $1',
      [toWarehouseId]
    );
    
    if (toWarehouseCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho nhập'
      }, { status: 404 });
    }

    const toWarehouseType = toWarehouseCheck.rows[0].warehouse_type;

    // Kiểm tra tương thích loại kho và loại hàng
    for (const item of items) {
      const isProduct = !!item.productId;
      const isMaterial = !!item.materialId;
      
      // Kiểm tra kho xuất có chứa loại hàng này không
      if (fromWarehouseType === 'NVL' && isProduct) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho NVL không chứa sản phẩm để chuyển'
        }, { status: 400 });
      }
      
      if (fromWarehouseType === 'THANH_PHAM' && isMaterial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho thành phẩm không chứa NVL để chuyển'
        }, { status: 400 });
      }

      // Kiểm tra kho nhập có nhận loại hàng này không
      if (toWarehouseType === 'NVL' && isProduct) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho NVL không nhận sản phẩm'
        }, { status: 400 });
      }
      
      if (toWarehouseType === 'THANH_PHAM' && isMaterial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho thành phẩm không nhận NVL'
        }, { status: 400 });
      }
    }

    // Tạo mã phiếu
    const codeResult = await query(
      `SELECT 'PC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
       FROM inventory_transactions 
       WHERE transaction_code LIKE 'PC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
    );
    const transactionCode = codeResult.rows[0].code;

    // Tạo phiếu chuyển kho
    const transResult = await query(
      `INSERT INTO inventory_transactions (transaction_code, transaction_type, from_warehouse_id, to_warehouse_id, status, notes, created_by)
       VALUES ($1, 'CHUYEN', $2, $3, 'PENDING', $4, $5)
       RETURNING id`,
      [transactionCode, fromWarehouseId, toWarehouseId, notes, currentUser.id]
    );

    const transactionId = transResult.rows[0].id;

    // Kiểm tra tồn kho và thêm chi tiết
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
          error: 'Không tìm thấy tồn kho cho mặt hàng'
        }, { status: 400 });
      }

      const currentQty = parseFloat(String(existingBalance.rows[0].quantity));
      const requestQty = parseFloat(String(item.quantity));

      if (currentQty < requestQty) {
        await query('DELETE FROM inventory_transactions WHERE id = $1', [transactionId]);
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Số lượng tồn kho không đủ. Tồn: ${currentQty}, Yêu cầu: ${requestQty}`
        }, { status: 400 });
      }

      await query(
        `INSERT INTO inventory_transaction_details (transaction_id, product_id, material_id, quantity, unit_price, total_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          transactionId,
          item.productId || null,
          item.materialId || null,
          item.quantity,
          item.unitPrice || 0,
          (item.quantity * (item.unitPrice || 0)),
          item.notes || null
        ]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: transactionId, transactionCode },
      message: 'Tạo phiếu luân chuyển kho thành công'
    });

  } catch (error) {
    console.error('Create transfer transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
