import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem chi tiết nhà cung cấp'
            }, { status: 403 });
        }

        const { id } = await params;
        const supplierId = parseInt(id);

        if (isNaN(supplierId)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'ID không hợp lệ'
            }, { status: 400 });
        }

        // Lấy danh sách items distinct từ lịch sử mua hàng
        const sql = `
      SELECT DISTINCT 
        pod.item_code as "itemCode",
        pod.item_name as "itemName",
        pod.unit,
        MAX(pod.unit_price) as "lastPrice",
        MAX(po.order_date) as "lastOrderDate",
        COUNT(po.id) as "orderCount",
        SUM(pod.quantity) as "totalQuantity"
      FROM purchase_order_details pod
      JOIN purchase_orders po ON po.id = pod.purchase_order_id
      WHERE po.supplier_id = $1
      GROUP BY pod.item_code, pod.item_name, pod.unit
      ORDER BY MAX(po.order_date) DESC
    `;

        const result = await query(sql, [supplierId]);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get supplier items error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
