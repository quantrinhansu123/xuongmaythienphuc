import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// POST - Thanh toán cho đơn hàng
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes, orderType } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod || !orderType) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['order', 'purchase_order'].includes(orderType)) {
      return NextResponse.json(
        { success: false, error: 'orderType phải là order hoặc purchase_order' },
        { status: 400 }
      );
    }

    const tableName = orderType === 'order' ? 'orders' : 'purchase_orders';
    const amountField = orderType === 'order' ? 'final_amount' : 'total_amount';

    // Lấy thông tin đơn hàng
    const orderResult = await query(
      `SELECT 
        ${amountField} as amount,
        paid_amount as "paidAmount",
        ${amountField} - paid_amount as "remainingAmount"
      FROM ${tableName}
      WHERE id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (paymentAmount > order.remainingAmount) {
      return NextResponse.json(
        { success: false, error: 'Số tiền thanh toán vượt quá số tiền còn lại' },
        { status: 400 }
      );
    }

    // Cập nhật paid_amount của đơn hàng
    const newPaidAmount = parseFloat(order.paidAmount) + parseFloat(paymentAmount);
    const newRemainingAmount = parseFloat(order.amount) - newPaidAmount;
    
    let newPaymentStatus = 'PARTIAL';
    if (newRemainingAmount === 0) {
      newPaymentStatus = 'PAID';
    } else if (newPaidAmount === 0) {
      newPaymentStatus = 'UNPAID';
    }

    await query(
      `UPDATE ${tableName}
       SET 
         paid_amount = $1,
         payment_status = $2
       WHERE id = $3`,
      [newPaidAmount, newPaymentStatus, id]
    );

    const transactionType = orderType === 'order' ? 'THU' : 'CHI';

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? paymentAmount : -paymentAmount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1 
         WHERE id = $2`,
        [balanceChange, bankAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        newPaidAmount,
        newRemainingAmount,
        newPaymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
