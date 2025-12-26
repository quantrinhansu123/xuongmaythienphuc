import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem đơn sản xuất'
            }, { status: 403 });
        }

        const { id } = await params;

        // Get production order details
        const poResult = await query(
            `SELECT 
        po.id,
        po.order_id as "orderId",
        po.status,
        po.current_step as "currentStep",
        po.start_date as "startDate",
        po.end_date as "endDate",
        po.worker_handover_date as "workerHandoverDate",
        po.fitting_date as "fittingDate",
        po.completion_date as "completionDate",
        po.sale_person as "salePerson",
        po.source_warehouse_id as "sourceWarehouseId",
        po.target_warehouse_id as "targetWarehouseId",
        sw.warehouse_name as "sourceWarehouseName",
        tw.warehouse_name as "targetWarehouseName",
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        po.created_at as "createdAt"
      FROM production_orders po
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN warehouses sw ON po.source_warehouse_id = sw.id
      LEFT JOIN warehouses tw ON po.target_warehouse_id = tw.id
      WHERE po.id = $1`,
            [id]
        );

        if (poResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy đơn sản xuất'
            }, { status: 404 });
        }

        const productionOrder = poResult.rows[0];

        // Get order items
        const itemsResult = await query(
            `SELECT 
        od.id,
        od.item_id as "itemId",
        i.item_name as "itemName",
        i.item_code as "itemCode",
        od.quantity,
        od.notes
       FROM order_details od
       JOIN items i ON od.item_id = i.id
       WHERE od.order_id = $1`,
            [productionOrder.orderId]
        );

        const items = itemsResult.rows;

        // Fetch measurements for these items
        if (items.length > 0) {
            const detailIds = items.map((i: any) => i.id);
            const measurementsResult = await query(
                `SELECT 
          om.order_detail_id as "orderDetailId",
          ca.attribute_name as "attributeName",
          om.value
         FROM order_item_measurements om
         JOIN category_attributes ca ON om.attribute_id = ca.id
         WHERE om.order_detail_id = ANY($1)`,
                [detailIds]
            );

            const measurementsByDetail = measurementsResult.rows.reduce((acc: any, m: any) => {
                if (!acc[m.orderDetailId]) acc[m.orderDetailId] = [];
                acc[m.orderDetailId].push(m);
                return acc;
            }, {});

            items.forEach((item: any) => {
                item.measurements = measurementsByDetail[item.id] || [];
            });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                ...productionOrder,
                items
            }
        });

    } catch (error) {
        console.error('Get production order detail error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
