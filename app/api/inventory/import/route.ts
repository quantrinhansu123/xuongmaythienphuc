import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách phiếu nhập kho
export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phiếu nhập kho'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    // Data segregation
    let whereClause = "WHERE it.transaction_type = 'NHAP'";
    const params: any[] = [];
    let paramIndex = 1;

    // Lọc theo kho cụ thể nếu có
    if (warehouseId) {
      whereClause += ` AND it.to_warehouse_id = $${paramIndex}`;
      params.push(parseInt(warehouseId));
      paramIndex++;
    }

    if (status && status !== 'ALL') {
      whereClause += ` AND it.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // User không phải admin chỉ xem phiếu của chi nhánh mình
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
        it.to_warehouse_id as "toWarehouseId",
        w.warehouse_name as "toWarehouseName",
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
       LEFT JOIN warehouses w ON w.id = it.to_warehouse_id
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
    console.error('Get import transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}


// POST - Tạo phiếu nhập kho mới
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo phiếu nhập kho'
      }, { status: 403 });
    }

    const body = await request.json();
    const { toWarehouseId, notes, items, relatedOrderCode, relatedCustomerName } = body;

    if (!toWarehouseId || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra quyền truy cập kho và loại kho
    const warehouseCheck = await query(
      'SELECT branch_id, warehouse_type FROM warehouses WHERE id = $1',
      [toWarehouseId]
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
        error: 'Không có quyền nhập vào kho này'
      }, { status: 403 });
    }

    // Kiểm tra loại hàng hóa phù hợp với loại kho
    for (const item of items) {
      const isProduct = !!item.productId;
      const isMaterial = !!item.materialId;
      
      if (warehouseType === 'NVL' && isProduct) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho NVL chỉ nhận nguyên vật liệu, không nhận sản phẩm'
        }, { status: 400 });
      }
      
      if (warehouseType === 'THANH_PHAM' && isMaterial) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Kho thành phẩm chỉ nhận sản phẩm, không nhận NVL'
        }, { status: 400 });
      }
    }

    // Tạo mã phiếu tự động
    const codeResult = await query(
      `SELECT 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
       FROM inventory_transactions 
       WHERE transaction_code LIKE 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
    );
    const transactionCode = codeResult.rows[0].code;

    // Tạo phiếu nhập với thông tin đơn hàng
    const transResult = await query(
      `INSERT INTO inventory_transactions (transaction_code, transaction_type, to_warehouse_id, status, notes, created_by, related_order_code, related_customer_name)
       VALUES ($1, 'NHAP', $2, 'PENDING', $3, $4, $5, $6)
       RETURNING id`,
      [transactionCode, toWarehouseId, notes, currentUser.id, relatedOrderCode || null, relatedCustomerName || null]
    );

    const transactionId = transResult.rows[0].id;

    // Thêm chi tiết (chưa cập nhật tồn kho)
    for (const item of items) {
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
      message: 'Tạo phiếu nhập kho thành công'
    });

  } catch (error) {
    console.error('Create import transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
