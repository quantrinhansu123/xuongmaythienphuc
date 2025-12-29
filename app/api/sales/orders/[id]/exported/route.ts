
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('sales.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem đơn hàng'
            }, { status: 403 });
        }

        const { id } = await params;

        // Lấy thông tin đơn hàng để lấy order_code
        const orderResult = await query(
            `SELECT order_code FROM orders WHERE id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy đơn hàng'
            }, { status: 404 });
        }

        const orderCode = orderResult.rows[0].order_code;

        // Lấy tổng số lượng đã xuất cho từng productId/materialId dựa trên related_order_code
        // Transaction type phải là 'XUAT'
        // Join inventory_transaction_details -> items
        const exportResult = await query(
            `SELECT 
                i.id as "itemId",
                i.product_id,
                i.material_id,
                SUM(CASE WHEN it.status IN ('COMPLETED', 'APPROVED') THEN itd.quantity ELSE 0 END) as "totalExported",
                SUM(CASE WHEN it.status = 'PENDING' THEN itd.quantity ELSE 0 END) as "totalPending"
             FROM inventory_transactions it
             JOIN inventory_transaction_details itd ON it.id = itd.transaction_id
             JOIN items i ON (
                (itd.product_id IS NOT NULL AND itd.product_id = i.product_id) OR 
                (itd.material_id IS NOT NULL AND itd.material_id = i.material_id)
             )
             WHERE it.related_order_code = $1 
               AND it.transaction_type = 'XUAT'
               AND it.status IN ('COMPLETED', 'APPROVED', 'PENDING')
             GROUP BY i.id, i.product_id, i.material_id`,
            [orderCode]
        );

        // Map kết quả: key có thể là "p-{productId}" hoặc "m-{materialId}" (hoặc itemId trực tiếp)
        // Trong order details, sales lưu item_id, product_id, material_id.
        // Tốt nhất trả về list để frontend map.

        return NextResponse.json<ApiResponse>({
            success: true,
            data: exportResult.rows.map(row => ({
                itemId: row.itemId,
                productId: row.product_id,
                materialId: row.material_id,
                totalExported: Number(row.totalExported),
                totalPending: Number(row.totalPending)
            }))
        });

    } catch (error) {
        console.error('Error fetching exported history:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
