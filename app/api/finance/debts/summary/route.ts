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
    const supplierIdParam = searchParams.get('supplierId');
    const customerIdParam = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (type === 'customers') {
      // Lấy danh sách khách hàng với công nợ theo kỳ
      const params: any[] = [];
      let paramIndex = 1;

      // Build subqueries with proper parameters
      const openingBalanceSubquery = startDate ? `
        COALESCE((
          SELECT SUM(o2.final_amount - COALESCE(o2.deposit_amount, 0) - COALESCE(o2.paid_amount, 0))
          FROM orders o2
          WHERE o2.customer_id = c.id 
            AND o2.status != 'CANCELLED'
            AND o2.order_date < $${paramIndex}::date
        ), 0)` : '0';

      if (startDate) {
        params.push(startDate);
        paramIndex++;
      }

      const periodDebtSubquery = (startDate && endDate) ? `
        COALESCE((
          SELECT SUM(o3.final_amount - COALESCE(o3.deposit_amount, 0) - COALESCE(o3.paid_amount, 0))
          FROM orders o3
          WHERE o3.customer_id = c.id 
            AND o3.status != 'CANCELLED'
            AND o3.order_date >= $${paramIndex}::date
            AND o3.order_date <= $${paramIndex + 1}::date
        ), 0)` : '0';

      if (startDate && endDate) {
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      // Subquery for total remaining amount (all time)
      const totalRemainingSubquery = `
        COALESCE((
          SELECT SUM(o_all.final_amount - COALESCE(o_all.deposit_amount, 0) - COALESCE(o_all.paid_amount, 0))
          FROM orders o_all
          WHERE o_all.customer_id = c.id 
            AND o_all.status != 'CANCELLED'
        ), 0)`;

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
          ${totalRemainingSubquery} as "remainingAmount",
          COUNT(CASE WHEN COALESCE(o.payment_status, 'UNPAID') != 'PAID' THEN 1 END) as "unpaidOrders",
          ${openingBalanceSubquery} as "openingBalance",
          ${periodDebtSubquery} as "periodDebt",
          ${totalRemainingSubquery} as "closingBalance"
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'CANCELLED'
      `;

      const whereConditions: string[] = ['c.is_active = true'];

      // Lọc theo thời gian cho JOIN chính (chỉ ảnh hưởng đến totalOrders và totalAmount trong kỳ)
      if (startDate && endDate) {
        whereConditions.push(`(o.order_date >= $${paramIndex}::date AND o.order_date <= $${paramIndex + 1}::date OR o.id IS NULL)`);
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        whereConditions.push(`(o.branch_id = $${paramIndex} OR o.branch_id IS NULL)`);
        params.push(user.branchId);
        paramIndex++;
      } else if (branchIdParam && branchIdParam !== 'all') {
        whereConditions.push(`(o.branch_id = $${paramIndex} OR o.branch_id IS NULL)`);
        params.push(parseInt(branchIdParam));
        paramIndex++;
      }

      // Lọc theo khách hàng cụ thể
      if (customerIdParam && customerIdParam !== 'all') {
        whereConditions.push(`c.id = $${paramIndex}`);
        params.push(parseInt(customerIdParam));
        paramIndex++;
      }

      sql += `
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY c.id, c.customer_code, c.customer_name, c.phone, c.email, c.address
        HAVING (${totalRemainingSubquery}) > 0 OR COUNT(o.id) > 0
        ORDER BY "remainingAmount" DESC
      `;

      const result = await query(sql, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } else if (type === 'suppliers') {
      // Lấy danh sách nhà cung cấp với công nợ theo kỳ
      const params: any[] = [];
      let paramIndex = 1;

      // Build subqueries with proper parameters
      const openingBalanceSubquery = startDate ? `
        COALESCE((
          SELECT SUM(po2.total_amount - COALESCE(po2.paid_amount, 0))
          FROM purchase_orders po2
          WHERE po2.supplier_id = s.id 
            AND po2.status != 'CANCELLED'
            AND po2.order_date < $${paramIndex}::date
        ), 0)` : '0';

      if (startDate) {
        params.push(startDate);
        paramIndex++;
      }

      const periodDebtSubquery = (startDate && endDate) ? `
        COALESCE((
          SELECT SUM(po3.total_amount - COALESCE(po3.paid_amount, 0))
          FROM purchase_orders po3
          WHERE po3.supplier_id = s.id 
            AND po3.status != 'CANCELLED'
            AND po3.order_date >= $${paramIndex}::date
            AND po3.order_date <= $${paramIndex + 1}::date
        ), 0)` : '0';

      if (startDate && endDate) {
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      // Subquery for total remaining amount (all time)
      const totalRemainingSubquery = `
        COALESCE((
          SELECT SUM(po_all.total_amount - COALESCE(po_all.paid_amount, 0))
          FROM purchase_orders po_all
          WHERE po_all.supplier_id = s.id 
            AND po_all.status != 'CANCELLED'
        ), 0)`;

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
          ${totalRemainingSubquery} as "remainingAmount",
          COUNT(CASE WHEN po.payment_status != 'PAID' THEN 1 END) as "unpaidOrders",
          ${openingBalanceSubquery} as "openingBalance",
          ${periodDebtSubquery} as "periodDebt",
          ${totalRemainingSubquery} as "closingBalance"
        FROM suppliers s
        LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status != 'CANCELLED'
      `;

      const whereConditions: string[] = ['s.is_active = true'];

      // Lọc theo thời gian cho JOIN chính (chỉ ảnh hưởng đến totalOrders và totalAmount trong kỳ)
      if (startDate && endDate) {
        whereConditions.push(`(po.order_date >= $${paramIndex}::date AND po.order_date <= $${paramIndex + 1}::date OR po.id IS NULL)`);
        params.push(startDate, endDate);
        paramIndex += 2;
      }

      // Lọc theo chi nhánh
      if (user.roleCode !== 'ADMIN') {
        whereConditions.push(`(po.branch_id = $${paramIndex} OR po.branch_id IS NULL)`);
        params.push(user.branchId);
        paramIndex++;
      } else if (branchIdParam && branchIdParam !== 'all') {
        whereConditions.push(`(po.branch_id = $${paramIndex} OR po.branch_id IS NULL)`);
        params.push(parseInt(branchIdParam));
        paramIndex++;
      }

      // Lọc theo nhà cung cấp cụ thể
      if (supplierIdParam && supplierIdParam !== 'all') {
        whereConditions.push(`s.id = $${paramIndex}`);
        params.push(parseInt(supplierIdParam));
        paramIndex++;
      }

      sql += `
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY s.id, s.supplier_code, s.supplier_name, s.phone, s.email, s.address
        HAVING (${totalRemainingSubquery}) > 0 OR COUNT(po.id) > 0
        ORDER BY "remainingAmount" DESC
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
