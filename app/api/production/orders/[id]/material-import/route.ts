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
        const { warehouseId, items } = body; // items: { materialId, quantityPlanned, quantityActual }[]

        if (!warehouseId || !items || items.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng chọn kho và nguyên vật liệu'
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

            // 1. Create Request
            const reqResult = await query(
                `INSERT INTO production_material_requests (production_order_id, warehouse_id, status)
         VALUES ($1, $2, 'CONFIRMED') RETURNING id`,
                [id, warehouseId]
            );
            const requestId = reqResult.rows[0].id;

            // 2. Create Request Details
            for (const item of items) {
                await query(
                    `INSERT INTO production_material_request_details (request_id, material_id, quantity_planned, quantity_actual)
           VALUES ($1, $2, $3, $4)`,
                    [requestId, item.materialId, item.quantityPlanned, item.quantityActual]
                );
            }

            // 3. Create Inventory Transaction (Export)
            // Generate Code
            const codeResult = await query(
                `SELECT 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((COALESCE(MAX(SUBSTRING(transaction_code FROM 9)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
         FROM inventory_transactions 
         WHERE transaction_code LIKE 'PX' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '%'`
            );
            const transactionCode = codeResult.rows[0].code;

            const transResult = await query(
                `INSERT INTO inventory_transactions (transaction_code, transaction_type, from_warehouse_id, status, notes, created_by, related_order_code, related_customer_name)
         VALUES ($1, 'XUAT', $2, 'PENDING', $3, $4, $5, $6)
         RETURNING id`,
                [transactionCode, warehouseId, `Xuất kho NVL cho đơn sản xuất #${id} - Đơn hàng: ${orderCode} - KH: ${customerName}`, currentUser.id, orderCode, customerName]
            );
            const transactionId = transResult.rows[0].id;

            // 4. Create Transaction Details
            // item.materialId là item_id, cần lấy material_id từ bảng items
            for (const item of items) {
                // Lấy material_id từ items (vì inventory_transaction_details.material_id FK đến materials)
                const itemResult = await query(
                    `SELECT material_id FROM items WHERE id = $1`,
                    [item.materialId]
                );
                const materialId = itemResult.rows[0]?.material_id;

                if (materialId) {
                    await query(
                        `INSERT INTO inventory_transaction_details (transaction_id, material_id, quantity)
             VALUES ($1, $2, $3)`,
                        [transactionId, materialId, item.quantityActual]
                    );
                }
            }

            // 5. Update Production Order Status/Step và lưu kho nguồn
            // Chuyển sang bước CUTTING sau khi nhập NVL xong
            await query(
                `UPDATE production_orders 
                 SET status = 'IN_PROGRESS', 
                     current_step = 'CUTTING', 
                     source_warehouse_id = $2,
                     updated_at = NOW() 
                 WHERE id = $1`,
                [id, warehouseId]
            );

            await query('COMMIT');

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Đã tạo yêu cầu và phiếu xuất kho thành công',
                data: { transactionId, transactionCode }
            });

        } catch (err) {
            await query('ROLLBACK');
            console.error('Transaction error:', err);
            throw err;
        }

    } catch (error) {
        console.error('Material import error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
