import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật đơn hàng'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status, paymentAmount, paymentMethod, bankAccountId, paymentNotes, isDeposit } = body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'MEASUREMENTS_COMPLETED', 'IN_PRODUCTION', 'READY_TO_EXPORT', 'EXPORTED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Trạng thái không hợp lệ: ' + status
      }, { status: 400 });
    }

    // Get order and customer info
    const orderResult = await query(
      `SELECT o.id, o.customer_id as "customerId", o.final_amount as "finalAmount", 
              COALESCE(o.deposit_amount, 0) as "depositAmount",
              COALESCE(o.paid_amount, 0) as "paidAmount", o.status
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // Update status
    await query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, orderId]
    );

    // Process payment if provided
    if (paymentAmount && parseFloat(paymentAmount) > 0) {
      const amount = parseFloat(paymentAmount);

      // Update payment for THIS order
      const currentPaid = parseFloat(order.paidAmount || 0);
      const currentDeposit = parseFloat(order.depositAmount || 0);
      const finalAmount = parseFloat(order.finalAmount);

      let newPaid = currentPaid;
      let newDeposit = currentDeposit;

      if (isDeposit) {
        // Save to deposit_amount
        newDeposit = currentDeposit + amount;
      } else {
        // Save to paid_amount
        newPaid = currentPaid + amount;
      }

      const totalPaid = newDeposit + newPaid;

      // Calculate payment status based on deposit_amount + paid_amount
      let newPaymentStatus = 'PARTIAL';
      if (totalPaid >= finalAmount - 0.01) { // Tolerance for float
        newPaymentStatus = 'PAID';
      } else if (totalPaid <= 0) {
        newPaymentStatus = 'UNPAID';
      }

      // Lấy user hiện tại
      const { user } = await requirePermission('sales.orders', 'edit');

      // 1. Lấy danh mục tài chính "Bán hàng" (THU)
      let categoryId: number | null = null;

      // 1.1 Tìm theo tên
      const categoryResult = await query(
        `SELECT id FROM financial_categories 
         WHERE category_name = 'Bán hàng' AND type = 'THU' AND is_active = true 
         LIMIT 1`
      );

      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      } else {
        // 1.2 Tìm theo mã
        const categoryCodeResult = await query(
          `SELECT id FROM financial_categories 
           WHERE category_code = 'BAN_HANG' AND type = 'THU' AND is_active = true 
           LIMIT 1`
        );

        if (categoryCodeResult.rows.length > 0) {
          categoryId = categoryCodeResult.rows[0].id;
        } else {
          // 1.3 Tạo mới nếu chưa có
          const newCategoryResult = await query(
            `INSERT INTO financial_categories 
             (category_code, category_name, type, is_active, description, created_at) 
             VALUES ('BAN_HANG', 'Bán hàng', 'THU', true, 'Doanh thu bán hàng', NOW()) 
             RETURNING id`
          );
          categoryId = newCategoryResult.rows[0].id;
        }
      }

      if (categoryId) {
        // 2. Tạo mã phiếu thu (SQ + YYMMDD + xxxx)
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
        const prefix = `SQ${dateStr}`;
        const lastCodeResult = await query(
          `SELECT transaction_code FROM cash_books WHERE transaction_code LIKE $1 ORDER BY transaction_code DESC LIMIT 1`,
          [`${prefix}%`]
        );

        let sequence = 1;
        if (lastCodeResult.rows.length > 0) {
          const lastCode = lastCodeResult.rows[0].transaction_code;
          sequence = parseInt(lastCode.slice(-4)) + 1;
        }
        const transactionCode = `${prefix}${sequence.toString().padStart(4, '0')}`;

        // 3. Insert vào cash_books
        await query(
          `INSERT INTO cash_books 
            (transaction_code, transaction_date, financial_category_id, amount, 
             transaction_type, payment_method, bank_account_id, reference_id, 
             reference_type, description, created_by, branch_id)
           VALUES ($1, CURRENT_DATE, $2, $3, 'THU', $4, $5, $6, 'ORDER', $7, $8, $9)`,
          [
            transactionCode,
            categoryId,
            amount,
            paymentMethod || 'CASH',
            bankAccountId || null,
            orderId,
            isDeposit ? `Thu tiền cọc đơn hàng ${orderResult.rows[0].order_code || ''}` : `Thu tiền đơn hàng ${orderResult.rows[0].order_code || ''}`,
            user.id,
            user.branchId
          ]
        );
      }
      // ---------------------------------------------

      // Ghi vào order_payments
      await query(
        `INSERT INTO order_payments (order_id, payment_type, amount, payment_method, bank_account_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, isDeposit ? 'DEPOSIT' : 'PAYMENT', amount, paymentMethod || 'CASH', bankAccountId || null, isDeposit ? 'Tiền cọc đơn hàng' : (paymentNotes || 'Thanh toán đơn hàng'), user?.id || null]
      );

      if (isDeposit) {
        await query(
          `UPDATE orders 
           SET deposit_amount = $1, payment_status = $2, payment_method = $3
           WHERE id = $4`,
          [newDeposit, newPaymentStatus, paymentMethod || null, orderId]
        );
      } else {
        await query(
          `UPDATE orders 
           SET paid_amount = $1, payment_status = $2, payment_method = $3
           WHERE id = $4`,
          [newPaid, newPaymentStatus, paymentMethod || null, orderId]
        );
      }

      // Update account balance if provided (bank or cash)
      if (bankAccountId) {
        await query(
          `UPDATE bank_accounts 
           SET balance = balance + $1 
           WHERE id = $2`,
          [amount, bankAccountId]
        );
      }

      // Cập nhật debt_amount của customer (giảm công nợ)
      if (order.customerId) {
        await query(
          `UPDATE customers SET debt_amount = GREATEST(0, COALESCE(debt_amount, 0) - $1) WHERE id = $2`,
          [amount, order.customerId]
        );
      }

      // Nếu thanh toán đủ và đang ở trạng thái CONFIRMED, tự động chuyển sang PAID
      if (newPaymentStatus === 'PAID' && status === 'CONFIRMED') {
        await query(
          `UPDATE orders SET status = 'PAID' WHERE id = $1`,
          [orderId]
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        message: `Cập nhật trạng thái và thanh toán thành công. Đã thanh toán ${amount.toLocaleString('vi-VN')}đ`,
        data: {
          status: newPaymentStatus === 'PAID' && status === 'CONFIRMED' ? 'PAID' : status,
          paymentProcessed: true,
          totalPayment: amount,
          ordersUpdated: 1,
        }
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật trạng thái thành công'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
