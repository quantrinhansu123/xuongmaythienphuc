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
    const { status, paymentAmount, paymentMethod, bankAccountId, paymentNotes } = body;

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
      const depositAmount = parseFloat(order.depositAmount || 0);
      const newPaid = currentPaid + amount;
      const finalAmount = parseFloat(order.finalAmount);
      const totalPaid = depositAmount + newPaid;

      // Calculate payment status based on deposit_amount + paid_amount
      let newPaymentStatus = 'PARTIAL';
      if (totalPaid >= finalAmount - 0.01) { // Tolerance for float
        newPaymentStatus = 'PAID';
      } else if (totalPaid <= 0) {
        newPaymentStatus = 'UNPAID';
      }

      // Lấy user hiện tại
      const { user } = await requirePermission('sales.orders', 'edit');

      // Ghi vào order_payments
      await query(
        `INSERT INTO order_payments (order_id, payment_type, amount, payment_method, bank_account_id, notes, created_by)
         VALUES ($1, 'PAYMENT', $2, $3, $4, $5, $6)`,
        [orderId, amount, paymentMethod || 'CASH', bankAccountId || null, paymentNotes || 'Thanh toán đơn hàng', user?.id || null]
      );

      await query(
        `UPDATE orders 
         SET paid_amount = $1, payment_status = $2, payment_method = $3
         WHERE id = $4`,
        [newPaid, newPaymentStatus, paymentMethod || null, orderId]
      );

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
