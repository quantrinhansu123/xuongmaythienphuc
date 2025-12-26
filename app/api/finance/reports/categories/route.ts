import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT 
        fc.category_name as name,
        fc.type,
        COALESCE(SUM(cb.amount), 0) as value
      FROM cash_books cb
      JOIN financial_categories fc ON cb.financial_category_id = fc.id
      WHERE cb.transaction_date::date BETWEEN $1::date AND $2::date
      GROUP BY fc.category_name, fc.type
      ORDER BY value DESC
    `, [startDate, endDate]);

    const categoryData = result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      value: parseFloat(row.value || '0'),
    }));

    return NextResponse.json({ success: true, data: categoryData });
  } catch (error: any) {
    console.error('Error fetching category data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi lấy dữ liệu danh mục' },
      { status: 500 }
    );
  }
}
