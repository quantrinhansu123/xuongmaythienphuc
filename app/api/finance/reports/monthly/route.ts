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
      branchFilter = ' AND branch_id = $3';
      params.push(user.branchId);
    } else if (branchIdParam && branchIdParam !== 'all') {
      branchFilter = ' AND branch_id = $3';
      params.push(parseInt(branchIdParam));
    }

    // Tạo danh sách các tháng trong khoảng thời gian
    const monthsResult = await query(`
      SELECT TO_CHAR(generate_series($1::date, $2::date, '1 month'::interval), 'YYYY-MM') as month
    `, [startDate, endDate]);

    const months = monthsResult.rows.map((row: any) => row.month);

    // Lấy dữ liệu thu từ cash_books (đã bao gồm cả thu từ đơn hàng)
    const revenueResult = await query(`
      SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as revenue
      FROM cash_books
      WHERE transaction_type = 'THU'
        AND transaction_date::date BETWEEN $1::date AND $2::date${branchFilter}
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
    `, params);

    // Lấy dữ liệu chi từ cash_books (đã bao gồm cả chi cho NCC)
    const expenseResult = await query(`
      SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as expense
      FROM cash_books
      WHERE transaction_type = 'CHI'
        AND transaction_date::date BETWEEN $1::date AND $2::date${branchFilter}
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
    `, params);

    // Tổng hợp dữ liệu theo tháng
    const revenueByMonth: { [key: string]: number } = {};
    const expenseByMonth: { [key: string]: number } = {};

    revenueResult.rows.forEach((row: any) => {
      const month = row.month;
      revenueByMonth[month] = (revenueByMonth[month] || 0) + parseFloat(row.revenue || '0');
    });

    expenseResult.rows.forEach((row: any) => {
      const month = row.month;
      expenseByMonth[month] = (expenseByMonth[month] || 0) + parseFloat(row.expense || '0');
    });

    const monthlyData = months.map((month: string) => {
      const revenue = revenueByMonth[month] || 0;
      const expense = expenseByMonth[month] || 0;
      return {
        month,
        revenue,
        expense,
        profit: revenue - expense,
      };
    });

    return NextResponse.json({ success: true, data: monthlyData });
  } catch (error: any) {
    console.error('Error fetching monthly data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu theo tháng' },
      { status: 500 }
    );
  }
}
