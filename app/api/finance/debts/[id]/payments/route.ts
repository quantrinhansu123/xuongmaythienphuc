import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// GET - Lấy lịch sử thanh toán công nợ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.debts', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await query(
      `SELECT 
        dp.id,
        dp.payment_amount as "paymentAmount",
        dp.payment_date as "paymentDate",
        dp.payment_method as "paymentMethod",
        dp.notes,
        ba.account_number as "bankAccountNumber",
        ba.bank_name as "bankName",
        u.full_name as "createdByName",
        dp.created_at as "createdAt"
      FROM debt_payments dp
      LEFT JOIN bank_accounts ba ON ba.id = dp.bank_account_id
      LEFT JOIN users u ON u.id = dp.created_by
      WHERE dp.debt_id = $1
      ORDER BY dp.payment_date DESC, dp.created_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching debt payments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Thanh toán công nợ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, bankAccountId, notes } = body;

    // Validate
    if (!paymentAmount || !paymentDate || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin công nợ
    const debtResult = await query(
      `SELECT 
        remaining_amount as "remainingAmount",
        customer_id as "customerId",
        supplier_id as "supplierId",
        debt_type as "debtType"
      FROM debt_management 
      WHERE id = $1`,
      [id]
    );

    if (debtResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy công nợ' },
        { status: 404 }
      );
    }

    const debt = debtResult.rows[0];

    if (paymentAmount > debt.remainingAmount) {
      return NextResponse.json(
        { success: false, error: 'Số tiền thanh toán vượt quá công nợ còn lại' },
        { status: 400 }
      );
    }

    // Thêm thanh toán
    const paymentResult = await query(
      `INSERT INTO debt_payments 
        (debt_id, payment_amount, payment_date, payment_method, bank_account_id, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        payment_amount as "paymentAmount",
        payment_date as "paymentDate",
        payment_method as "paymentMethod",
        created_at as "createdAt"`,
      [id, paymentAmount, paymentDate, paymentMethod, bankAccountId || null, notes, user.id]
    );

    // Cập nhật remaining_amount
    const newRemaining = debt.remainingAmount - paymentAmount;
    let newStatus = 'PARTIAL';
    
    if (newRemaining === 0) {
      newStatus = 'PAID';
    } else if (newRemaining === debt.remainingAmount) {
      newStatus = 'PENDING';
    }

    await query(
      `UPDATE debt_management 
       SET remaining_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newRemaining, newStatus, id]
    );

    // Cập nhật debt_amount của customer hoặc supplier
    if (debt.customerId) {
      await query(
        `UPDATE customers SET debt_amount = debt_amount - $1 WHERE id = $2`,
        [paymentAmount, debt.customerId]
      );
    }

    if (debt.supplierId) {
      await query(
        `UPDATE suppliers SET debt_amount = debt_amount - $1 WHERE id = $2`,
        [paymentAmount, debt.supplierId]
      );
    }

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = debt.debtType === 'RECEIVABLE' ? paymentAmount : -paymentAmount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1 
         WHERE id = $2`,
        [balanceChange, bankAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating debt payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
