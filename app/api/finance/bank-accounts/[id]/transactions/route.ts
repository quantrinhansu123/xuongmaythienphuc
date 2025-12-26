import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy lịch sử giao dịch của tài khoản
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
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const transactionType = searchParams.get('type');

        let sql = `
      SELECT 
        cb.id,
        cb.transaction_code as "transactionCode",
        cb.transaction_date as "transactionDate",
        cb.amount,
        cb.transaction_type as "transactionType",
        cb.payment_method as "paymentMethod",
        cb.description,
        COALESCE(fc.category_name, 'Không có') as "categoryName",
        COALESCE(u.full_name, u.username, 'Hệ thống') as "createdByName",
        cb.created_at as "createdAt"
      FROM cash_books cb
      LEFT JOIN financial_categories fc ON fc.id = cb.financial_category_id
      LEFT JOIN users u ON u.id = cb.created_by
      WHERE cb.bank_account_id = $1
    `;

        const queryParams: any[] = [accountId];
        let paramCount = 2;

        if (startDate) {
            sql += ` AND cb.transaction_date >= $${paramCount}`;
            queryParams.push(startDate);
            paramCount++;
        }

        if (endDate) {
            sql += ` AND cb.transaction_date <= $${paramCount}`;
            queryParams.push(endDate);
            paramCount++;
        }

        if (transactionType) {
            sql += ` AND cb.transaction_type = $${paramCount}`;
            queryParams.push(transactionType);
            paramCount++;
        }

        sql += ` ORDER BY cb.transaction_date DESC, cb.created_at DESC LIMIT 100`;

        const result = await query(sql, queryParams);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error: any) {
        console.error('Error fetching account transactions:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
