import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách danh mục tài chính
export async function GET(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // THU hoặc CHI
    const isActive = searchParams.get('isActive');

    let sql = `
      SELECT 
        fc.id,
        fc.category_code as "categoryCode",
        fc.category_name as "categoryName",
        fc.type,
        fc.description,
        fc.is_active as "isActive",
        fc.created_at as "createdAt",
        fc.bank_account_id as "bankAccountId",
        ba.bank_name as "bankName",
        ba.account_number as "bankAccountNumber",
        COALESCE(SUM(CASE WHEN cb.transaction_type = 'THU' THEN cb.amount ELSE 0 END), 0)::float as "totalIn",
        COALESCE(SUM(CASE WHEN cb.transaction_type = 'CHI' THEN cb.amount ELSE 0 END), 0)::float as "totalOut",
        (
          COALESCE(SUM(CASE WHEN cb.transaction_type = 'THU' THEN cb.amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN cb.transaction_type = 'CHI' THEN cb.amount ELSE 0 END), 0)
        )::float as "balance"
      FROM financial_categories fc
      LEFT JOIN cash_books cb ON fc.id = cb.financial_category_id
      LEFT JOIN bank_accounts ba ON fc.bank_account_id = ba.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (type && type !== 'ALL') {
      sql += ` AND fc.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (isActive !== null && isActive !== undefined) {
      sql += ` AND fc.is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    sql += ` GROUP BY fc.id, ba.bank_name, ba.account_number ORDER BY fc.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching financial categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo danh mục tài chính mới
export async function POST(request: NextRequest) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'create');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    let body = await request.json();
    let { categoryCode, categoryName, type, description, bankAccountId } = body;

    // Validate required fields (except categoryCode - will auto-generate if missing)
    if (!categoryName || !type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // if (!['THU', 'CHI'].includes(type)) {
    //   return NextResponse.json(
    //     { success: false, error: 'Loại danh mục không hợp lệ (THU hoặc CHI)' },
    //     { status: 400 }
    //   );
    // }

    // Auto-generate category code if not provided
    if (!categoryCode) {
      const prefix = type; // THU or CHI

      // Get the latest category code of this type
      const lastCodeResult = await query(
        `SELECT category_code 
         FROM financial_categories 
         WHERE category_code LIKE $1 
         ORDER BY category_code DESC 
         LIMIT 1`,
        [`${prefix}%`]
      );

      let sequence = 1;
      if (lastCodeResult.rows.length > 0) {
        const lastCode = lastCodeResult.rows[0].category_code;
        const lastSeq = parseInt(lastCode.slice(3)); // Skip 'THU' or 'CHI'
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }

      categoryCode = `${prefix}${sequence.toString().padStart(3, '0')}`;
    }

    const result = await query(
      `INSERT INTO financial_categories 
        (category_code, category_name, type, description, bank_account_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        type,
        description,
        is_active as "isActive",
        created_at as "createdAt"`,
      [categoryCode, categoryName, type, description, bankAccountId || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating financial category:', error);

    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Mã danh mục đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
