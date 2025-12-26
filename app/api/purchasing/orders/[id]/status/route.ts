import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật đơn đặt hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const poId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Trạng thái không hợp lệ: ' + status
      }, { status: 400 });
    }

    // Lấy thông tin đơn đặt hàng
    const poResult = await query(
      `SELECT po.*, s.supplier_name 
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [poId]
    );

    if (poResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn đặt hàng'
      }, { status: 404 });
    }

    const purchaseOrder = poResult.rows[0];
    
    console.log('Purchase Order:', {
      id: purchaseOrder.id,
      po_code: purchaseOrder.po_code,
      warehouse_id: purchaseOrder.warehouse_id,
      status: status
    });

    // Nếu chuyển sang DELIVERED và có warehouse_id, tự động tạo phiếu nhập kho
    if (status === 'DELIVERED' && purchaseOrder.warehouse_id) {
      console.log('Creating import transaction for warehouse:', purchaseOrder.warehouse_id);
      // Lấy chi tiết đơn đặt hàng
      const detailsResult = await query(
        `SELECT * FROM purchase_order_details WHERE purchase_order_id = $1`,
        [poId]
      );

      // Tạo mã phiếu nhập
      const codeResult = await query(
        `SELECT 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
         FROM inventory_transactions 
         WHERE transaction_code LIKE 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
      );
      const transactionCode = codeResult.rows[0].code;

      // Tạo phiếu nhập kho
      const transResult = await query(
        `INSERT INTO inventory_transactions (
          transaction_code, transaction_type, to_warehouse_id, status, notes, created_by,
          related_order_code, related_customer_name
        ) VALUES ($1, 'NHAP', $2, 'PENDING', $3, $4, $5, $6)
        RETURNING id`,
        [
          transactionCode,
          purchaseOrder.warehouse_id,
          `Nhập kho từ đơn mua hàng ${purchaseOrder.po_code} - NCC: ${purchaseOrder.supplier_name}`,
          currentUser.id,
          purchaseOrder.po_code,
          purchaseOrder.supplier_name
        ]
      );
      const transactionId = transResult.rows[0].id;

      // Thêm chi tiết phiếu nhập
      for (const detail of detailsResult.rows) {
        await query(
          `INSERT INTO inventory_transaction_details (
            transaction_id, material_id, quantity, unit_price, total_amount, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            transactionId,
            detail.material_id,
            detail.quantity,
            detail.unit_price,
            detail.total_amount,
            detail.notes
          ]
        );
      }
      
      console.log('Import transaction created:', transactionCode);
    } else if (status === 'DELIVERED') {
      console.log('No warehouse_id found, skipping import transaction creation');
    }

    // Cập nhật trạng thái đơn đặt hàng
    await query(
      `UPDATE purchase_orders 
       SET status = $1
       WHERE id = $2`,
      [status, poId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: status === 'DELIVERED' && purchaseOrder.warehouse_id 
        ? 'Cập nhật trạng thái và tạo phiếu nhập kho thành công'
        : 'Cập nhật trạng thái thành công'
    });

  } catch (error) {
    console.error('Update purchase order status error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
