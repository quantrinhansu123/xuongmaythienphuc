import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách tài khoản ngân hàng
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const isActive = searchParams.get('isActive');

    let sql = `
      SELECT 
        ba.id,
        ba.account_number as "accountNumber",
        ba.account_holder as "accountHolder",
        ba.bank_name as "bankName",
        ba.branch_name as "branchName",
        ba.balance,
        ba.is_active as "isActive",
        COALESCE(ba.account_type, 'BANK') as "accountType",
        b.branch_name as "companyBranchName",
        ba.created_at as "createdAt"
      FROM bank_accounts ba
      LEFT JOIN branches b ON b.id = ba.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by branch
    if (user.roleCode !== 'ADMIN') {
      sql += ` AND ba.branch_id = $${paramCount}`;
      params.push(user.branchId);
      paramCount++;
    } else if (branchId) {
      sql += ` AND ba.branch_id = $${paramCount}`;
      params.push(branchId);
      paramCount++;
    }

    if (isActive !== null && isActive !== undefined) {
      sql += ` AND ba.is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    sql += ` ORDER BY ba.bank_name, ba.account_number`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo tài khoản ngân hàng mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'create');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { accountNumber, accountHolder, bankName, branchName, balance, branchId, accountType } = body;

    // Validate
    if (!accountNumber || !accountHolder) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Nếu là tài khoản ngân hàng thì cần bankName
    if (accountType !== 'CASH' && !bankName) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập tên ngân hàng' },
        { status: 400 }
      );
    }

    const finalBranchId = user.roleCode === 'ADMIN' ? branchId : user.branchId;
    const finalBankName = accountType === 'CASH' ? 'Tiền mặt' : bankName;

    const result = await query(
      `INSERT INTO bank_accounts 
        (account_number, account_holder, bank_name, branch_name, balance, branch_id, account_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        account_number as "accountNumber",
        account_holder as "accountHolder",
        bank_name as "bankName",
        branch_name as "branchName",
        balance,
        is_active as "isActive",
        account_type as "accountType",
        created_at as "createdAt"`,
      [accountNumber, accountHolder, finalBankName, branchName || null, balance || 0, finalBranchId, accountType || 'BANK']
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
