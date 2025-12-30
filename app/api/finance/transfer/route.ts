import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// POST - Luân chuyển quỹ
export async function POST(request: NextRequest) {
    const { hasPermission, user, error } = await requirePermission('finance.categories', 'create');

    if (!hasPermission) {
        return NextResponse.json({ success: false, error }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { sourceCategoryId, targetCategoryId, amount, date, description } = body;

        // Validate
        if (!sourceCategoryId || !targetCategoryId || !amount || !date) {
            return NextResponse.json(
                { success: false, error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        if (sourceCategoryId === targetCategoryId) {
            return NextResponse.json(
                { success: false, error: 'Quỹ nguồn và quỹ đích phải khác nhau' },
                { status: 400 }
            );
        }

        const transferAmount = parseFloat(amount);
        if (transferAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Số tiền luân chuyển phải lớn hơn 0' },
                { status: 400 }
            );
        }

        // Lấy thông tin 2 quỹ
        const categoriesResult = await query(
            `SELECT id, category_name, bank_account_id FROM financial_categories WHERE id IN ($1, $2)`,
            [sourceCategoryId, targetCategoryId]
        );

        const sourceCat = categoriesResult.rows.find((c: any) => c.id == sourceCategoryId);
        const targetCat = categoriesResult.rows.find((c: any) => c.id == targetCategoryId);

        if (!sourceCat || !targetCat) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy thông tin quỹ' },
                { status: 404 }
            );
        }

        // Tạo mã giao dịch chung
        const txCodeResult = await query(
            `SELECT 'LC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || 
       LPAD((COALESCE(MAX(CASE 
         WHEN transaction_code ~ ('^LC' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '[0-9]{4}$')
         THEN SUBSTRING(transaction_code FROM 9 FOR 4)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 4, '0') as code
       FROM cash_books 
       WHERE DATE(created_at) = CURRENT_DATE AND transaction_code LIKE 'LC%'`
        );
        const transferCode = txCodeResult.rows[0].code;

        // Begin transaction logic (manual, since we don't have explicit transaction manager wrapper yet, 
        // but individual queries are fine as long as we handle errors appropriately. 
        // Ideally use BEGIN/COMMIT but for now sequential exec is consistent with existing codebase pattern)

        const txDate = date || new Date().toISOString();
        const memo = description || `Luân chuyển từ ${sourceCat.category_name} sang ${targetCat.category_name}`;

        // 1. Tạo phiếu CHI ở quỹ nguồn
        await query(
            `INSERT INTO cash_books 
        (transaction_code, transaction_date, transaction_type, amount, payment_method, 
         bank_account_id, financial_category_id, description, branch_id, created_by)
       VALUES ($1, $2, 'CHI', $3, 'TRANSFER', $4, $5, $6, $7, $8)`,
            [
                transferCode + '-OUT',
                txDate,
                transferAmount,
                sourceCat.bank_account_id || null, // Nếu quỹ k có tk liên kết, thì ko update tk, nhưng vẫn ghi cashbook
                sourceCategoryId,
                memo,
                user.branchId,
                user.id
            ]
        );

        // 2. Tạo phiếu THU ở quỹ đích
        await query(
            `INSERT INTO cash_books 
        (transaction_code, transaction_date, transaction_type, amount, payment_method, 
         bank_account_id, financial_category_id, description, branch_id, created_by)
       VALUES ($1, $2, 'THU', $3, 'TRANSFER', $4, $5, $6, $7, $8)`,
            [
                transferCode + '-IN',
                txDate,
                transferAmount,
                targetCat.bank_account_id || null,
                targetCategoryId,
                memo,
                user.branchId,
                user.id
            ]
        );

        // 3. Trừ tiền ở TK nguồn (nếu có)
        if (sourceCat.bank_account_id) {
            await query(
                `UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2`,
                [transferAmount, sourceCat.bank_account_id]
            );
        }

        // 4. Cộng tiền ở TK đích (nếu có)
        if (targetCat.bank_account_id) {
            await query(
                `UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`,
                [transferAmount, targetCat.bank_account_id]
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Luân chuyển thành công',
            data: { transferCode }
        });

    } catch (error: any) {
        console.error('Error transferring funds:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
