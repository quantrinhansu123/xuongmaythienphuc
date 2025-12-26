import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy lịch sử thanh toán của đơn hàng
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        op.id,
        op.payment_type as "paymentType",
        op.amount,
        op.payment_method as "paymentMethod",
        op.bank_account_id as "bankAccountId",
        ba.account_number as "accountNumber",
        ba.bank_name as "bankName",
        COALESCE(ba.account_type, 'BANK') as "accountType",
        op.notes,
        u.full_name as "createdByName",
        op.created_at as "createdAt"
       FROM order_payments op
       LEFT JOIN bank_accounts ba ON ba.id = op.bank_account_id
       LEFT JOIN users u ON u.id = op.created_by
       WHERE op.order_id = $1
       ORDER BY op.created_at DESC`,
      [id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get order payments error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST - Thêm thanh toán cho đơn hàng
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user, error } = await requirePermission('sales.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền'
      }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    const body = await request.json();
    const { amount, paymentType, paymentMethod, bankAccountId, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Số tiền không hợp lệ'
      }, { status: 400 });
    }

    // Lấy thông tin đơn hàng
    const orderResult = await query(
      `SELECT 
        o.id, 
        o.customer_id as "customerId",
        o.final_amount as "finalAmount",
        COALESCE(o.deposit_amount, 0) as "depositAmount",
        COALESCE(o.paid_amount, 0) as "paidAmount",
        o.status
       FROM orders o WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    const order = orderResult.rows[0];
    const finalAmount = parseFloat(order.finalAmount);
    const currentDeposit = parseFloat(order.depositAmount);
    const currentPaid = parseFloat(order.paidAmount);
    const totalPaid = currentDeposit + currentPaid;
    const remaining = finalAmount - totalPaid;

    // Kiểm tra số tiền thanh toán
    if (amount > remaining + 0.01) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Số tiền thanh toán vượt quá số còn lại (${remaining.toLocaleString('vi-VN')}đ)`
      }, { status: 400 });
    }

    // Ghi vào order_payments
    await query(
      `INSERT INTO order_payments (order_id, payment_type, amount, payment_method, bank_account_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orderId, paymentType || 'PAYMENT', amount, paymentMethod || 'CASH', bankAccountId || null, notes || null, user.id]
    );

    // Cập nhật đơn hàng
    let newDeposit = currentDeposit;
    let newPaid = currentPaid;

    if (paymentType === 'DEPOSIT') {
      newDeposit = currentDeposit + amount;
    } else {
      newPaid = currentPaid + amount;
    }

    const newTotalPaid = newDeposit + newPaid;
    let newPaymentStatus = 'PARTIAL';
    if (newTotalPaid >= finalAmount - 0.01) {
      newPaymentStatus = 'PAID';
    } else if (newTotalPaid <= 0) {
      newPaymentStatus = 'UNPAID';
    }

    await query(
      `UPDATE orders 
       SET deposit_amount = $1, paid_amount = $2, payment_status = $3, payment_method = $4
       WHERE id = $5`,
      [newDeposit, newPaid, newPaymentStatus, paymentMethod, orderId]
    );

    // Cập nhật số dư tài khoản và ghi sổ quỹ nếu có chọn
    if (bankAccountId) {
      await query(
        `UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`,
        [amount, bankAccountId]
      );

      // Lấy thông tin khách hàng
      const customerResult = await query(
        `SELECT customer_name, customer_code FROM customers WHERE id = $1`,
        [order.customerId]
      );
      const customer = customerResult.rows[0] || { customer_name: 'Khách lẻ', customer_code: '' };

      // Lấy mã đơn hàng
      const orderCodeResult = await query(
        `SELECT order_code FROM orders WHERE id = $1`,
        [orderId]
      );
      const orderCode = orderCodeResult.rows[0]?.order_code || '';

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

      // Lấy danh mục tài chính phù hợp (THU)
      const categoryResult = await query(
        `SELECT id FROM financial_categories 
         WHERE type = 'THU' AND is_active = true 
         ORDER BY id LIMIT 1`
      );
      const categoryId = categoryResult.rows.length > 0 ? categoryResult.rows[0].id : null;

      // Ghi vào sổ quỹ
      const txDescription = paymentType === 'DEPOSIT'
        ? `Đặt cọc đơn hàng ${orderCode} - KH: ${customer.customer_name}`
        : `Thanh toán đơn hàng ${orderCode} - KH: ${customer.customer_name}`;

      await query(
        `INSERT INTO cash_books 
          (transaction_code, transaction_date, transaction_type, amount, payment_method, 
           bank_account_id, financial_category_id, description, branch_id, created_by)
         VALUES ($1, CURRENT_DATE, 'THU', $2::numeric, $3, $4::integer, $5::integer, $6, $7::integer, $8::integer)`,
        [
          transactionCode,
          amount,
          paymentMethod || 'CASH',
          parseInt(bankAccountId),
          categoryId,
          notes || txDescription,
          user.branchId,
          user.id
        ]
      );
    }

    // Cập nhật công nợ khách hàng (giảm công nợ)
    if (order.customerId) {
      await query(
        `UPDATE customers SET debt_amount = GREATEST(0, COALESCE(debt_amount, 0) - $1) WHERE id = $2`,
        [amount, order.customerId]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Thanh toán ${amount.toLocaleString('vi-VN')}đ thành công`,
      data: {
        newDeposit,
        newPaid,
        newTotalPaid,
        remaining: finalAmount - newTotalPaid,
        paymentStatus: newPaymentStatus
      }
    });

  } catch (error) {
    console.error('Add order payment error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
