import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { hasPermission, user: currentUser, error } = await requirePermission('production.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem đơn sản xuất'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        let sql = `
      SELECT 
        po.id,
        po.order_id as "orderId",
        po.status,
        po.current_step as "currentStep",
        po.start_date as "startDate",
        po.end_date as "endDate",
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        po.created_at as "createdAt",
        b.id as "branchId",
        b.branch_name as "branchName",
        i.item_name as "itemName",
        i.item_code as "itemCode",
        od.quantity as "quantity"
      FROM production_orders po
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN order_details od ON po.order_item_id = od.id
      LEFT JOIN items i ON od.item_id = i.id
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            sql += ` AND po.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            sql += ` AND (o.order_code ILIKE $${paramIndex} OR c.customer_name ILIKE $${paramIndex} OR i.item_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY po.created_at DESC`;

        const result = await query(sql, params);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get production orders error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền tạo đơn sản xuất'
            }, { status: 403 });
        }

        const body = await request.json();
        const { orderId, sourceWarehouseId, targetWarehouseId } = body;

        if (!orderId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Thiếu mã đơn hàng'
            }, { status: 400 });
        }

        // 1. Get all items in the order that are PRODUCTS (assuming we only produce products)
        // We join with items table to check type if necessary, or just assume all valid items in order need production if they are products
        // Let's assume we fetch all items.
        // Also check if they already have a production order.

        const itemsResult = await query(
            `SELECT od.id, od.item_id, i.item_type, i.item_name 
             FROM order_details od
             JOIN items i ON od.item_id = i.id
             WHERE od.order_id = $1 AND i.item_type = 'PRODUCT'`,
            [orderId]
        );

        if (itemsResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy sản phẩm nào trong đơn hàng để sản xuất'
            }, { status: 400 });
        }

        const createdOrders = [];
        const existingOrders = [];

        // 2. Loop and create production order for each item
        for (const item of itemsResult.rows) {
            // Check existence
            const check = await query(
                'SELECT id FROM production_orders WHERE order_item_id = $1',
                [item.id]
            );

            if (check.rows.length > 0) {
                existingOrders.push({ itemId: item.id, productionOrderId: check.rows[0].id });
                continue;
            }

            // Create
            const insert = await query(
                `INSERT INTO production_orders (order_id, order_item_id, status, current_step, start_date, source_warehouse_id, target_warehouse_id)
                 VALUES ($1, $2, 'MATERIAL_IMPORT', 'MATERIAL_IMPORT', NOW(), $3, $4)
                 RETURNING id`,
                [orderId, item.id, sourceWarehouseId || null, targetWarehouseId || null]
            );

            createdOrders.push(insert.rows[0]);
        }

        // Also update the main order status if not already executing
        await query(`UPDATE orders SET status = 'IN_PRODUCTION' WHERE id = $1 AND status != 'IN_PRODUCTION'`, [orderId]);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { created: createdOrders.length, existing: existingOrders.length },
            message: `Đã tạo ${createdOrders.length} đơn sản xuất. ${existingOrders.length} sản phẩm đã có đơn sản xuất.`
        });

    } catch (error) {
        console.error('Create production order error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
