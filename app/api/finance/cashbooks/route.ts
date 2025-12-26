import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách sổ quỹ
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionType = searchParams.get('transactionType'); // THU, CHI
    const paymentMethod = searchParams.get('paymentMethod'); // CASH, BANK, TRANSFER
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');

    let sql = `
      SELECT 
        cb.id,
        cb.transaction_code as "transactionCode",
        cb.transaction_date as "transactionDate",
        cb.amount,
        cb.transaction_type as "transactionType",
        cb.payment_method as "paymentMethod",
        cb.description,
        cb.reference_type as "referenceType",
        cb.reference_id as "referenceId",
        cb.financial_category_id as "categoryId",
        cb.bank_account_id as "bankAccountId",
        fc.category_name as "categoryName",
        fc.category_code as "categoryCode",
        ba.account_number as "bankAccountNumber",
        ba.bank_name as "bankName",
        u.full_name as "createdByName",
        COALESCE(b.branch_name, ub.branch_name) as "branchName",
        cb.created_at as "createdAt"
      FROM cash_books cb
      LEFT JOIN financial_categories fc ON fc.id = cb.financial_category_id
      LEFT JOIN bank_accounts ba ON ba.id = cb.bank_account_id
      LEFT JOIN users u ON u.id = cb.created_by
      LEFT JOIN branches b ON b.id = cb.branch_id
      LEFT JOIN branches ub ON ub.id = u.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by branch (nếu không phải ADMIN)
    if (user.roleCode !== 'ADMIN') {
      sql += ` AND COALESCE(cb.branch_id, u.branch_id) = $${paramCount}`;
      params.push(user.branchId);
      paramCount++;
    } else if (branchId) {
      sql += ` AND COALESCE(cb.branch_id, u.branch_id) = $${paramCount}`;
      params.push(branchId);
      paramCount++;
    }

    if (transactionType) {
      sql += ` AND cb.transaction_type = $${paramCount}`;
      params.push(transactionType);
      paramCount++;
    }

    if (paymentMethod) {
      sql += ` AND cb.payment_method = $${paramCount}`;
      params.push(paymentMethod);
      paramCount++;
    }

    if (startDate) {
      sql += ` AND cb.transaction_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      sql += ` AND cb.transaction_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    sql += ` ORDER BY cb.transaction_date DESC, cb.created_at DESC`;

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching cash books:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo phiếu thu/chi mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.cashbooks', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    let {
      transactionCode,
      transactionDate,
      financialCategoryId,
      amount,
      transactionType,
      paymentMethod,
      bankAccountId,
      referenceId,
      referenceType,
      description,
      branchId,
    } = body;

    // Validate required fields - bankAccountId is now required
    if (!transactionDate || !financialCategoryId || !amount || !transactionType || !bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Auto-generate transaction code if not provided
    if (!transactionCode) {
      const dateStr = new Date(transactionDate).toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
      const prefix = `SQ${dateStr}`;

      // Get the latest transaction code of the day
      const lastCodeResult = await query(
        `SELECT transaction_code 
         FROM cash_books 
         WHERE transaction_code LIKE $1 
         ORDER BY transaction_code DESC 
         LIMIT 1`,
        [`${prefix}%`]
      );

      let sequence = 1;
      if (lastCodeResult.rows.length > 0) {
        const lastCode = lastCodeResult.rows[0].transaction_code;
        const lastSeq = parseInt(lastCode.slice(-4));
        sequence = lastSeq + 1;
      }

      transactionCode = `${prefix}${sequence.toString().padStart(4, '0')}`;
    }

    if (!['THU', 'CHI'].includes(transactionType)) {
      return NextResponse.json(
        { success: false, error: 'Loại giao dịch không hợp lệ' },
        { status: 400 }
      );
    }

    // Get bank account to determine payment method
    const accountResult = await query(
      `SELECT account_type FROM bank_accounts WHERE id = $1`,
      [bankAccountId]
    );

    if (accountResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản không tồn tại' },
        { status: 400 }
      );
    }

    // Auto-detect payment method from account type
    const accountType = accountResult.rows[0].account_type;
    const finalPaymentMethod = accountType === 'CASH' ? 'CASH' : 'BANK';

    const finalBranchId = user.roleCode === 'ADMIN' ? branchId : user.branchId;

    const result = await query(
      `INSERT INTO cash_books 
        (transaction_code, transaction_date, financial_category_id, amount, 
         transaction_type, payment_method, bank_account_id, reference_id, 
         reference_type, description, created_by, branch_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id,
        transaction_code as "transactionCode",
        transaction_date as "transactionDate",
        amount,
        transaction_type as "transactionType",
        payment_method as "paymentMethod",
        description,
        created_at as "createdAt"`,
      [
        transactionCode,
        transactionDate,
        financialCategoryId,
        amount,
        transactionType,
        finalPaymentMethod,
        bankAccountId || null,
        referenceId || null,
        referenceType || null,
        description,
        user.id,
        finalBranchId,
      ]
    );

    // Cập nhật số dư tài khoản ngân hàng nếu có
    if (bankAccountId) {
      const balanceChange = transactionType === 'THU' ? amount : -amount;
      await query(
        `UPDATE bank_accounts 
         SET balance = balance + $1 
         WHERE id = $2`,
        [balanceChange, bankAccountId]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating cash book:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Mã giao dịch đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
