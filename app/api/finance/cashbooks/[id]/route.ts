import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// DELETE - Xóa phiếu thu/chi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.cashbooks', 'delete');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Lấy thông tin phiếu trước khi xóa để hoàn trả số dư
    const cashbook = await query(
      `SELECT transaction_type as "transactionType", amount, bank_account_id as "bankAccountId"
       FROM cash_books WHERE id = $1`,
      [id]
    );

    if (cashbook.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiếu thu/chi' },
        { status: 404 }
      );
    }

    const { transactionType, amount, bankAccountId } = cashbook.rows[0];

    // Xóa phiếu
    await query('DELETE FROM cash_books WHERE id = $1', [id]);

    // Hoàn trả số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? -amount : amount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1 
         WHERE id = $2`,
        [balanceChange, bankAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa phiếu thu/chi thành công',
    });
  } catch (error: any) {
    console.error('Error deleting cash book:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
