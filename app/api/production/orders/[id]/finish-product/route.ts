import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, user: currentUser, error } = await requirePermission('production.orders', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền thực hiện thao tác này'
            }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { warehouseId, items } = body; // items: { itemId, quantity }[]

        if (!warehouseId || !items || items.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng chọn kho và sản phẩm'
            }, { status: 400 });
        }

        await query('BEGIN');

        try {
            // 0. Lấy thông tin đơn hàng từ production order
            const orderInfoResult = await query(
                `SELECT o.order_code, c.customer_name
                 FROM production_orders po
                 JOIN orders o ON po.order_id = o.id
                 JOIN customers c ON o.customer_id = c.id
                 WHERE po.id = $1`,
                [id]
            );
            const orderInfo = orderInfoResult.rows[0];
            const orderCode = orderInfo?.order_code || '';
            const customerName = orderInfo?.customer_name || '';

            // 1. Generate transaction code
            const codeResult = await query(
                `SELECT 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
                 FROM inventory_transactions 
                 WHERE transaction_code LIKE 'PN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
            );
            const transactionCode = codeResult.rows[0].code;

            // 2. Create inventory transaction (NHAP) - Trạng thái PENDING chờ duyệt
            const transResult = await query(
                `INSERT INTO inventory_transactions (transaction_code, transaction_type, to_warehouse_id, status, notes, created_by, related_order_code, related_customer_name)
                 VALUES ($1, 'NHAP', $2, 'PENDING', $3, $4, $5, $6)
                 RETURNING id`,
                [transactionCode, warehouseId, `Nhập kho thành phẩm từ đơn sản xuất #${id} - Đơn hàng: ${orderCode} - KH: ${customerName}`, currentUser.id, orderCode, customerName]
            );
            const transactionId = transResult.rows[0].id;

            // 3. Create transaction details & update inventory
            for (const item of items) {
                if (item.quantity <= 0) continue;

                // Get product_id from items table
                const itemResult = await query(
                    `SELECT product_id FROM items WHERE id = $1`,
                    [item.itemId]
                );
                const productId = itemResult.rows[0]?.product_id;

                // Insert transaction detail
                await query(
                    `INSERT INTO inventory_transaction_details (transaction_id, product_id, quantity)
                     VALUES ($1, $2, $3)`,
                    [transactionId, productId, item.quantity]
                );

                // Không update inventory balance ngay, chờ duyệt phiếu
            }

            // 4. Update production order status to COMPLETED and save target warehouse
            const poResult = await query(
                `UPDATE production_orders 
                 SET status = 'COMPLETED', current_step = 'COMPLETED', end_date = NOW(), 
                     target_warehouse_id = $2, updated_at = NOW() 
                 WHERE id = $1
                 RETURNING order_id`,
                [id, warehouseId]
            );

            // 5. Update order status to IN_PRODUCTION (sẵn sàng xuất kho cho khách)
            if (poResult.rows.length > 0) {
                const orderId = poResult.rows[0].order_id;
                await query(
                    `UPDATE orders 
                     SET status = 'IN_PRODUCTION', updated_at = NOW()
                     WHERE id = $1`,
                    [orderId]
                );
            }

            await query('COMMIT');

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Đã nhập kho thành phẩm và hoàn thành đơn sản xuất',
                data: { transactionId, transactionCode }
            });

        } catch (err) {
            await query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        }

    } catch (error) {
        console.error('Finish product error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
