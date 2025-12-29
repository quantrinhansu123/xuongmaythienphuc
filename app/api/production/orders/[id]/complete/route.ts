import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// POST: Hoàn thành đơn sản xuất thủ công
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền'
            }, { status: 403 });
        }

        const { id } = await params;

        await query('BEGIN');

        try {
            // Update production order status to COMPLETED
            const poResult = await query(
                `UPDATE production_orders 
                 SET status = 'COMPLETED', current_step = 'COMPLETED', end_date = NOW(), updated_at = NOW() 
                 WHERE id = $1
                 RETURNING order_id`,
                [id]
            );

            if (poResult.rows.length === 0) {
                await query('ROLLBACK');
                return NextResponse.json<ApiResponse>({
                    success: false,
                    error: 'Không tìm thấy đơn sản xuất'
                }, { status: 404 });
            }

            // Update order status to IN_PRODUCTION (sẵn sàng xuất kho cho khách)
            const orderId = poResult.rows[0].order_id;
            await query(
                `UPDATE orders 
                 SET status = 'IN_PRODUCTION', updated_at = NOW()
                 WHERE id = $1`,
                [orderId]
            );

            await query('COMMIT');

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Đã hoàn thành đơn sản xuất'
            });

        } catch (err) {
            await query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        }

    } catch (error) {
        console.error('Complete production order error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
