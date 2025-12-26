import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy thông tin chi tiết tài khoản
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.cashbooks', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { id } = await params;
    const accountId = parseInt(id);

    const result = await query(
      `SELECT 
        ba.id,
        ba.account_number as "accountNumber",
        ba.account_holder as "accountHolder",
        ba.bank_name as "bankName",
        ba.branch_name as "branchName",
        ba.balance,
        ba.is_active as "isActive",
        COALESCE(ba.account_type, 'BANK') as "accountType",
        b.branch_name as "companyBranchName",
        ba.branch_id as "branchId",
        ba.created_at as "createdAt"
      FROM bank_accounts ba
      LEFT JOIN branches b ON b.id = ba.branch_id
      WHERE ba.id = $1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Toggle trạng thái
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.cashbooks', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { id } = await params;
    const accountId = parseInt(id);
    const body = await request.json();
    const { isActive } = body;

    const result = await query(
      `UPDATE bank_accounts SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, is_active as "isActive"`,
      [isActive, accountId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating bank account status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật tài khoản ngân hàng
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.bank_accounts', 'edit');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    console.log('Updating bank account with ID:', id);

    const body = await request.json();
    const { accountNumber, accountHolder, bankName, branchName, balance } = body;

    if (!accountNumber || !accountHolder || !bankName) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE bank_accounts 
       SET account_number = $1,
           account_holder = $2,
           bank_name = $3,
           branch_name = $4,
           balance = $5
       WHERE id = $6
       RETURNING 
         id,
         account_number as "accountNumber",
         account_holder as "accountHolder",
         bank_name as "bankName",
         branch_name as "branchName",
         balance,
         is_active as "isActive"`,
      [accountNumber, accountHolder, bankName, branchName || null, balance, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Xóa tài khoản ngân hàng
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.bank_accounts', 'delete');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    console.log('Deleting bank account with ID:', id);

    // Kiểm tra tài khoản có tồn tại không
    const existCheck = await query(
      'SELECT id FROM bank_accounts WHERE id = $1',
      [id]
    );

    if (existCheck.rows.length === 0) {
      console.log('Bank account not found:', id);
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    // Kiểm tra xem có giao dịch nào sử dụng tài khoản này không
    const checkResult = await query(
      'SELECT COUNT(*) as count FROM cash_books WHERE bank_account_id = $1',
      [id]
    );

    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Không thể xóa tài khoản đã có giao dịch' },
        { status: 400 }
      );
    }

    const result = await query(
      'DELETE FROM bank_accounts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa tài khoản thành công',
    });
  } catch (error: any) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
