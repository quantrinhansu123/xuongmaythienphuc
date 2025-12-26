import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn đặt hàng'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const unpaidOnly = searchParams.get('unpaidOnly') === 'true';

    let sql = `SELECT 
        po.id,
        po.po_code as "poCode",
        po.po_code as "orderCode",
        s.supplier_name as "supplierName",
        po.order_date as "orderDate",
        po.expected_date as "expectedDate",
        po.total_amount as "totalAmount",
        COALESCE(po.paid_amount, 0) as "paidAmount",
        po.total_amount - COALESCE(po.paid_amount, 0) as "remainingAmount",
        po.status,
        u.full_name as "createdBy",
        po.created_at as "createdAt"
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN users u ON u.id = po.created_by
       WHERE po.branch_id = $1`;
    
    const params: (string | number)[] = [currentUser.branchId];
    let paramIndex = 2;

    if (supplierId) {
      sql += ` AND po.supplier_id = $${paramIndex}`;
      params.push(parseInt(supplierId));
      paramIndex++;
    }

    if (unpaidOnly) {
      sql += ` AND po.total_amount > COALESCE(po.paid_amount, 0)`;
    }

    sql += ` ORDER BY po.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn đặt hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { supplierId, warehouseId, orderDate, expectedDate, notes, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn đặt hàng phải có ít nhất 1 nguyên liệu'
      }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );

    // Tạo mã đơn
    const codeResult = await query(
      `SELECT 'PO' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
       LPAD((COUNT(*) + 1)::TEXT, 4, '0') as code
       FROM purchase_orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const poCode = codeResult.rows[0].code;

    // Tạo đơn đặt hàng
    const poResult = await query(
      `INSERT INTO purchase_orders (
        po_code, supplier_id, branch_id, warehouse_id, order_date, expected_date,
        total_amount, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        poCode,
        supplierId,
        currentUser.branchId,
        warehouseId || null,
        orderDate,
        expectedDate,
        totalAmount,
        notes || null,
        currentUser.id
      ]
    );

    const poId = poResult.rows[0].id;

    // Thêm chi tiết
    for (const item of items) {
      await query(
        `INSERT INTO purchase_order_details (
          purchase_order_id, material_id, item_code, item_name, unit,
          quantity, unit_price, total_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          poId,
          item.materialId,
          item.itemCode || null,
          item.itemName,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
          item.notes || null
        ]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: poId, poCode }
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
