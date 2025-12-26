import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.reports', 'view');

  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const branchIdParam = searchParams.get('branchId');

    const params: any[] = [startDate, endDate];
    let branchFilter = '';

    // Xử lý filter chi nhánh
    if (user.roleCode !== 'ADMIN') {
      branchFilter = ' AND cb.branch_id = $3';
      params.push(user.branchId);
    } else if (branchIdParam && branchIdParam !== 'all') {
      branchFilter = ' AND cb.branch_id = $3';
      params.push(parseInt(branchIdParam));
    }

    const result = await query(`
      WITH daily_transactions AS (
        -- Lấy tất cả giao dịch từ cash_books (đã bao gồm cả thanh toán đơn hàng và NCC)
        SELECT 
          cb.transaction_date::date as date,
          COALESCE(SUM(CASE WHEN cb.transaction_type = 'THU' THEN cb.amount ELSE 0 END), 0) as cash_in,
          COALESCE(SUM(CASE WHEN cb.transaction_type = 'CHI' THEN cb.amount ELSE 0 END), 0) as cash_out
        FROM cash_books cb
        WHERE cb.transaction_date::date BETWEEN $1::date AND $2::date${branchFilter}
        GROUP BY cb.transaction_date::date
      ),
      cumulative AS (
        SELECT 
          date,
          cash_in,
          cash_out,
          SUM(cash_in - cash_out) OVER (ORDER BY date) as balance
        FROM daily_transactions
      )
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        cash_in,
        cash_out,
        balance
      FROM cumulative
      ORDER BY date
    `, params);

    const cashFlowData = result.rows.map((row: any) => ({
      date: row.date,
      cashIn: parseFloat(row.cash_in || '0'),
      cashOut: parseFloat(row.cash_out || '0'),
      balance: parseFloat(row.balance || '0'),
    }));

    return NextResponse.json({ success: true, data: cashFlowData });
  } catch (error: any) {
    console.error('Error fetching cash flow data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu dòng tiền' },
      { status: 500 }
    );
  }
}
