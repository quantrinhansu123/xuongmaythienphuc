import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy tổng hợp công nợ theo khách hàng và nhà cung cấp
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'customers' hoặc 'suppliers'
  
  // Kiểm tra quyền theo type
  const permissionCode = type === 'customers' ? 'sales.debts' : type === 'suppliers' ? 'purchasing.debts' : 'finance.debts';
  const { hasPermission, user, error } = await requirePermission(permissionCode, 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const branchIdParam = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (type === 'customers') {
      // Lấy danh sách khách hàng với tổng công nợ từ đơn hàng
      // Công nợ = final_amount - deposit_amount - paid_amount
      let sql = `
        SELECT 
          c.id,
          c.customer_code as "customerCode",
          c.customer_name as "customerName",
          c.phone,
          c.email,
          c.address,
          COUNT(o.id) as "totalOrders",
          COALESCE(SUM(o.final_amount), 0) as "totalAmount",
          COALESCE(SUM(COALESCE(o.deposit_amount, 0) + COALESCE(o.paid_amount, 0)), 0) as "paidAmount",
          COALESCE(SUM(o.final_amount - COALESCE(o.deposit_amount, 0) - COALESCE(o.paid_amount, 0)), 0) as "remainingAmount",
          COUNT(CASE WHEN COALESCE(o.payment_status, 'UNPAID') != 'PAID' THEN 1 END) as "unpaidOrders"
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'CANCELLED'
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Lọc theo thời gian
      if (startDate && endDate) {
        sql += ` AND o.order_date >= $${paramIndex} AND o.order_date <= $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      }
      
      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        // Non-admin chỉ xem chi nhánh của mình
        sql += ` AND (o.branch_id = $${paramIndex} OR o.branch_id IS NULL)`;
        params.push(user.branchId);
        paramIndex++;
      } else if (branchIdParam && branchIdParam !== 'all') {
        // Admin có thể chọn chi nhánh cụ thể
        sql += ` AND (o.branch_id = $${paramIndex} OR o.branch_id IS NULL)`;
        params.push(parseInt(branchIdParam));
        paramIndex++;
      }
      // Nếu admin và branchId = 'all' thì không filter
      
      sql += `
        WHERE c.is_active = true
        GROUP BY c.id, c.customer_code, c.customer_name, c.phone, c.email, c.address
        HAVING COUNT(o.id) > 0
        ORDER BY COALESCE(SUM(o.final_amount - COALESCE(o.paid_amount, 0)), 0) DESC
      `;
      
      const result = await query(sql, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } else if (type === 'suppliers') {
      // Lấy danh sách nhà cung cấp với tổng công nợ từ đơn mua
      let sql = `
        SELECT 
          s.id,
          s.supplier_code as "supplierCode",
          s.supplier_name as "supplierName",
          s.phone,
          s.email,
          s.address,
          COUNT(po.id) as "totalOrders",
          COALESCE(SUM(po.total_amount), 0) as "totalAmount",
          COALESCE(SUM(po.paid_amount), 0) as "paidAmount",
          COALESCE(SUM(po.total_amount - po.paid_amount), 0) as "remainingAmount",
          COUNT(CASE WHEN po.payment_status != 'PAID' THEN 1 END) as "unpaidOrders"
        FROM suppliers s
        LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status != 'CANCELLED'
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Lọc theo thời gian
      if (startDate && endDate) {
        sql += ` AND po.order_date >= $${paramIndex} AND po.order_date <= $${paramIndex + 1}`;
        params.push(startDate, endDate);
        paramIndex += 2;
      }
      
      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        // Non-admin chỉ xem chi nhánh của mình
        sql += ` AND (po.branch_id = $${paramIndex} OR po.branch_id IS NULL)`;
        params.push(user.branchId);
        paramIndex++;
      } else if (branchIdParam && branchIdParam !== 'all') {
        // Admin có thể chọn chi nhánh cụ thể
        sql += ` AND (po.branch_id = $${paramIndex} OR po.branch_id IS NULL)`;
        params.push(parseInt(branchIdParam));
        paramIndex++;
      }
      // Nếu admin và branchId = 'all' thì không filter
      
      sql += `
        WHERE s.is_active = true
        GROUP BY s.id, s.supplier_code, s.supplier_name, s.phone, s.email, s.address
        HAVING COUNT(po.id) > 0
        ORDER BY COALESCE(SUM(po.total_amount - po.paid_amount), 0) DESC
      `;
      
      const result = await query(sql, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Type phải là customers hoặc suppliers' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching debt summary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
