import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// GET - Lấy danh sách đơn hàng của khách hàng hoặc nhà cung cấp
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');

    if (customerId) {
      // Lấy đơn hàng bán của khách hàng
      let sql = `
        SELECT 
          o.id,
          o.order_code as "orderCode",
          o.order_date as "orderDate",
          o.total_amount as "totalAmount",
          o.discount_amount as "discountAmount",
          o.final_amount as "finalAmount",
          o.paid_amount as "paidAmount",
          o.final_amount - o.paid_amount as "remainingAmount",
          o.payment_status as "paymentStatus",
          o.status,
          o.notes,
          c.customer_name as "customerName",
          c.customer_code as "customerCode",
          b.branch_name as "branchName",
          o.created_at as "createdAt"
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        LEFT JOIN branches b ON b.id = o.branch_id
        WHERE o.customer_id = $1 AND o.status != 'CANCELLED'
      `;
      
      const params: any[] = [customerId];
      
      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        sql += ` AND o.branch_id = $2`;
        params.push(user.branchId);
      }
      
      sql += ` ORDER BY o.order_date DESC, o.created_at DESC`;
      
      const result = await query(sql, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } else if (supplierId) {
      // Lấy đơn mua của nhà cung cấp
      let sql = `
        SELECT 
          po.id,
          po.po_code as "orderCode",
          po.order_date as "orderDate",
          po.total_amount as "totalAmount",
          po.paid_amount as "paidAmount",
          po.total_amount - po.paid_amount as "remainingAmount",
          po.payment_status as "paymentStatus",
          po.status,
          po.expected_date as "expectedDate",
          po.notes,
          s.supplier_name as "supplierName",
          s.supplier_code as "supplierCode",
          b.branch_name as "branchName",
          po.created_at as "createdAt"
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN branches b ON b.id = po.branch_id
        WHERE po.supplier_id = $1 AND po.status != 'CANCELLED'
      `;
      
      const params: any[] = [supplierId];
      
      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        sql += ` AND po.branch_id = $2`;
        params.push(user.branchId);
      }
      
      sql += ` ORDER BY po.order_date DESC, po.created_at DESC`;
      
      const result = await query(sql, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Phải cung cấp customerId hoặc supplierId' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
