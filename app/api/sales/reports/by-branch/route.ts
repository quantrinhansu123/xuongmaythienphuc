import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { hasPermission, error } = await requirePermission('sales.orders', 'view');

    if (!hasPermission) {
        return NextResponse.json({ success: false, error }, { status: 403 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
        const salesEmployeeId = searchParams.get('salesEmployeeId');
        const itemIdParam = searchParams.get('itemId');

        const params: any[] = [startDate, endDate];
        let branchFilter = ''; // Branch filter is generally implicit in group by, but we might filter authorized branches later if needed. For now simpler.
        let additionalFilter = '';
        let paramIndex = 3;

        if (salesEmployeeId && salesEmployeeId !== 'all') {
            additionalFilter += ` AND created_by = $${paramIndex}`;
            params.push(parseInt(salesEmployeeId));
            paramIndex++;
        }

        // Xử lý filter sản phẩm
        if (itemIdParam && itemIdParam !== 'all') {
            additionalFilter += ` AND EXISTS (SELECT 1 FROM order_details od WHERE od.order_id = orders.id AND od.item_id = $${paramIndex})`;
            params.push(parseInt(itemIdParam));
            paramIndex++;
        }

        const result = await query(`
        SELECT 
            b.id as "branchId",
            b.branch_name as "branchName",
            COUNT(orders.id) as "totalOrders",
            COALESCE(SUM(orders.final_amount), 0) as "totalRevenue",
            COALESCE(SUM(orders.paid_amount), 0) as "totalPaid",
            COALESCE(SUM(orders.final_amount - COALESCE(orders.paid_amount, 0)), 0) as "totalUnpaid"
        FROM branches b
        LEFT JOIN orders ON orders.branch_id = b.id 
            AND orders.order_date::date BETWEEN $1::date AND $2::date
            AND orders.status != 'CANCELLED'${additionalFilter}
        GROUP BY b.id, b.branch_name
        ORDER BY "totalRevenue" DESC
    `, params);

        const branchData = result.rows.map((row: any) => ({
            branchId: row.branchId,
            branchName: row.branchName,
            totalOrders: parseInt(row.totalOrders || '0'),
            totalRevenue: parseFloat(row.totalRevenue || '0'),
            totalPaid: parseFloat(row.totalPaid || '0'),
            totalUnpaid: parseFloat(row.totalUnpaid || '0'),
        }));

        return NextResponse.json({ success: true, data: branchData });
    } catch (error: any) {
        console.error('Error fetching branch sales report:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi khi lấy báo cáo theo chi nhánh' },
            { status: 500 }
        );
    }
}
