import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn hàng'
      }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const unpaidOnly = searchParams.get('unpaidOnly') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchIdParam = searchParams.get('branchId');
    const customerId = searchParams.get('customerId');

    const params: any[] = [];
    let paramIndex = 1;
    let whereConditions: string[] = [];

    // Branch filter
    if (currentUser.roleCode !== 'ADMIN') {
      whereConditions.push(`o.branch_id = $${paramIndex}`);
      params.push(currentUser.branchId);
      paramIndex++;
    } else if (branchIdParam && branchIdParam !== 'all') {
      whereConditions.push(`o.branch_id = $${paramIndex}`);
      params.push(parseInt(branchIdParam));
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(`(o.order_code ILIKE $${paramIndex} OR c.customer_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Payment status filter
    if (paymentStatus) {
      if (paymentStatus === 'DEPOSITED') {
        // Đã cọc = có deposit_amount > 0 và chưa PAID
        whereConditions.push(`(COALESCE(o.deposit_amount, 0) > 0 AND COALESCE(o.payment_status, 'UNPAID') != 'PAID')`);
      } else {
        whereConditions.push(`COALESCE(o.payment_status, 'UNPAID') = $${paramIndex}`);
        params.push(paymentStatus);
        paramIndex++;
      }
    }

    // Customer filter
    if (customerId) {
      whereConditions.push(`o.customer_id = $${paramIndex}`);
      params.push(parseInt(customerId));
      paramIndex++;
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(`o.order_date::date >= $${paramIndex}::date`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`o.order_date::date <= $${paramIndex}::date`);
      params.push(endDate);
      paramIndex++;
    }

    // Unpaid only filter - lọc đơn hàng chưa thanh toán đủ
    if (unpaidOnly) {
      whereConditions.push(`(o.final_amount - COALESCE(o.deposit_amount, 0) - COALESCE(o.paid_amount, 0)) > 0`);
      whereConditions.push(`o.status NOT IN ('CANCELLED')`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500
    const offset = (page - 1) * limit;

    // Count total (chỉ khi cần pagination)
    let total = 0;
    if (searchParams.get('page')) {
      const countResult = await query(
        `SELECT COUNT(*) as total
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         ${whereClause}`,
        params
      );
      total = parseInt(countResult.rows[0].total);
    }

    const result = await query(
      `SELECT 
        o.id,
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.discount_amount as "discountAmount",
        o.final_amount as "finalAmount",
        COALESCE(o.other_costs, 0) as "otherCosts",
        COALESCE(o.deposit_amount, 0) as "depositAmount",
        COALESCE(o.paid_amount, 0) as "paidAmount",
        (o.final_amount - COALESCE(o.deposit_amount, 0) - COALESCE(o.paid_amount, 0)) as "remainingAmount",
        COALESCE(o.payment_status, 'UNPAID') as "paymentStatus",
        o.status,
        u.full_name as "createdBy",
        o.created_at as "createdAt",
        b.id as "branchId",
        b.id as "branchId",
        b.branch_name as "branchName",
        (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.id) as "itemCount"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.created_by
       LEFT JOIN branches b ON b.id = o.branch_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows,
      ...(searchParams.get('page') && {
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      })
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

async function createQuickCustomer(customerData: any, branchId: number) {
  let customerCode: string;
  let phone = customerData.phone;

  if (phone) {
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      throw new Error('Số điện thoại không hợp lệ (phải là 10-11 số, bắt đầu bằng 0 hoặc +84)');
    }
    phone = cleanPhone;

    const last6Digits = phone.slice(-6);
    customerCode = `KH${last6Digits}`;

    const checkResult = await query(
      'SELECT customer_code FROM customers WHERE customer_code LIKE $1 ORDER BY customer_code DESC LIMIT 1',
      [`${customerCode}%`]
    );

    if (checkResult.rows.length > 0) {
      const existingCode = checkResult.rows[0].customer_code;
      const match = existingCode.match(/_(\d+)$/);
      const nextNum = match ? parseInt(match[1]) + 1 : 1;
      customerCode = `${customerCode}_${nextNum.toString().padStart(2, '0')}`;
    }
  } else {
    const codeResult = await query(
      `SELECT 'KH' || LPAD((COALESCE(MAX(CASE 
         WHEN customer_code ~ '^KH[0-9]+$' 
         THEN SUBSTRING(customer_code FROM 3)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 6, '0') as code
       FROM customers`
    );
    customerCode = codeResult.rows[0].code;
  }

  const result = await query(
    `INSERT INTO customers (customer_code, customer_name, phone, address, branch_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, customer_code as "customerCode", customer_name as "customerName"`,
    [customerCode, customerData.customerName, phone || null, customerData.address || null, branchId]
  );

  return result.rows[0];
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.orders', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo đơn hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, newCustomer, orderDate, items, discountAmount, depositAmount, depositAccountId, depositMethod, notes, branchId, otherCosts } = body;

    if (!items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Đơn hàng phải có ít nhất 1 hàng hoá'
      }, { status: 400 });
    }

    let finalCustomerId = customerId;
    if (!customerId && newCustomer) {
      if (!newCustomer.customerName) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Vui lòng nhập tên khách hàng'
        }, { status: 400 });
      }
      const createdCustomer = await createQuickCustomer(newCustomer, currentUser.branchId);
      finalCustomerId = createdCustomer.id;
    }

    if (!finalCustomerId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn hoặc tạo khách hàng'
      }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unitPrice), 0
    );
    const finalAmount = totalAmount - (discountAmount || 0) + (otherCosts || 0);

    // Validate deposit amount
    const deposit = parseFloat(depositAmount || 0);
    if (deposit < 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tiền đặt cọc không được âm'
      }, { status: 400 });
    }
    if (deposit > finalAmount) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tiền đặt cọc không được vượt quá tổng tiền đơn hàng'
      }, { status: 400 });
    }

    const codeResult = await query(
      `SELECT 'DH' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
       LPAD((COALESCE(MAX(CASE 
         WHEN order_code ~ ('^DH' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '[0-9]{4}$')
         THEN SUBSTRING(order_code FROM 9 FOR 4)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 4, '0') as code
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const orderCode = codeResult.rows[0].code;

    // Calculate payment status based on deposit_amount
    let paymentStatus = 'UNPAID';
    if (deposit > 0 && deposit >= finalAmount) {
      paymentStatus = 'PAID';
    } else if (deposit > 0) {
      paymentStatus = 'PARTIAL';
    }

    const orderResult = await query(
      `INSERT INTO orders (
        order_code, customer_id, branch_id, order_date,
        total_amount, discount_amount, final_amount, other_costs,
        deposit_amount, payment_status,
        notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        orderCode,
        finalCustomerId,
        (currentUser.roleCode === 'ADMIN' && branchId) ? parseInt(branchId) : currentUser.branchId,
        orderDate,
        totalAmount,
        discountAmount || 0,
        finalAmount,
        otherCosts || 0,
        deposit || 0,
        paymentStatus,
        notes || null,
        currentUser.id
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const detailResult = await query(
        `INSERT INTO order_details (
          order_id, item_id, product_id, quantity, unit_price, 
          cost_price, total_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          orderId,
          item.itemId || null,
          item.productId || null,
          item.quantity,
          item.unitPrice,
          item.costPrice || 0,
          item.quantity * item.unitPrice,
          item.notes || null
        ]
      );

      const detailId = detailResult.rows[0].id;

      // Save measurements if any
      if (item.measurements && Array.isArray(item.measurements)) {
        for (const m of item.measurements) {
          if (m.attributeId && m.value) {
            await query(
              `INSERT INTO order_item_measurements (order_detail_id, attribute_id, value)
               VALUES ($1, $2, $3)`,
              [detailId, m.attributeId, m.value]
            );
          }
        }
      }
    }

    let finalAccountId = depositAccountId;

    if (deposit > 0 && !finalAccountId) {
      const catResult = await query(
        `SELECT bank_account_id FROM financial_categories 
           WHERE (category_code = 'BAN_HANG' OR category_name = 'Bán hàng') 
           AND type = 'THU' AND is_active = true 
           LIMIT 1`
      );
      if (catResult.rows.length > 0) {
        finalAccountId = catResult.rows[0].bank_account_id;
      }
    }

    if (deposit > 0) {
      // Ghi vào order_payments
      await query(
        `INSERT INTO order_payments (order_id, payment_type, amount, payment_method, bank_account_id, notes, created_by)
         VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, $6)`,
        [orderId, deposit, depositMethod || 'CASH', finalAccountId || null, 'Tiền đặt cọc khi tạo đơn', currentUser.id]
      );

      // Cập nhật số dư tài khoản và ghi sổ quỹ nếu có chọn
      if (finalAccountId) {
        await query(
          `UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`,
          [deposit, finalAccountId]
        );

        // Lấy thông tin khách hàng
        const customerResult = await query(
          `SELECT customer_name, customer_code FROM customers WHERE id = $1`,
          [finalCustomerId]
        );
        const customer = customerResult.rows[0] || { customer_name: 'Khách lẻ', customer_code: '' };

        // Tạo mã giao dịch cho sổ quỹ
        const txCodeResult = await query(
          `SELECT 'SQ' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
           LPAD((COALESCE(MAX(CASE 
             WHEN transaction_code ~ ('^SQ' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '[0-9]{4}$')
             THEN SUBSTRING(transaction_code FROM 9 FOR 4)::INTEGER 
             ELSE 0 
           END), 0) + 1)::TEXT, 4, '0') as code
           FROM cash_books 
           WHERE DATE(created_at) = CURRENT_DATE`
        );
        const transactionCode = txCodeResult.rows[0].code;

        // Lấy danh mục tài chính "Bán hàng" (THU)
        let categoryId: number | null = null;

        // 1. Tìm theo tên
        const categoryResult = await query(
          `SELECT id FROM financial_categories 
           WHERE category_name = 'Bán hàng' AND type = 'THU' AND is_active = true 
           LIMIT 1`
        );

        if (categoryResult.rows.length > 0) {
          categoryId = categoryResult.rows[0].id;
        } else {
          // 2. Tìm theo mã
          const categoryCodeResult = await query(
            `SELECT id FROM financial_categories 
             WHERE category_code = 'BAN_HANG' AND type = 'THU' AND is_active = true 
             LIMIT 1`
          );

          if (categoryCodeResult.rows.length > 0) {
            categoryId = categoryCodeResult.rows[0].id;
          } else {
            // 3. Tạo mới nếu chưa có
            const newCategoryResult = await query(
              `INSERT INTO financial_categories 
               (category_code, category_name, type, is_active, description, created_at) 
               VALUES ('BAN_HANG', 'Bán hàng', 'THU', true, 'Doanh thu bán hàng', NOW()) 
               RETURNING id`
            );
            categoryId = newCategoryResult.rows[0].id;
          }
        }

        // Ghi vào sổ quỹ
        await query(
          `INSERT INTO cash_books 
            (transaction_code, transaction_date, transaction_type, amount, payment_method, 
             bank_account_id, financial_category_id, description, branch_id, created_by)
           VALUES ($1, CURRENT_DATE, 'THU', $2::numeric, $3, $4::integer, $5::integer, $6, $7::integer, $8::integer)`,
          [
            transactionCode,
            deposit,
            depositMethod || 'CASH',
            parseInt(finalAccountId),
            categoryId,
            `Đặt cọc đơn hàng ${orderCode} - KH: ${customer.customer_name}`,
            currentUser.branchId,
            currentUser.id
          ]
        );
      }
    }

    // Cập nhật debt_amount của khách hàng (công nợ = số tiền còn phải trả)
    const remainingDebt = finalAmount - deposit;
    if (remainingDebt > 0) {
      await query(
        `UPDATE customers SET debt_amount = COALESCE(debt_amount, 0) + $1 WHERE id = $2`,
        [remainingDebt, finalCustomerId]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: orderId, orderCode }
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
