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

        // 1. Get Production Order Items
        const poResult = await query(
            `SELECT order_id FROM production_orders WHERE id = $1`,
            [id]
        );

        if (poResult.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy đơn sản xuất'
            }, { status: 404 });
        }

        const orderId = poResult.rows[0].order_id;

        // 2. Get Order Items and their BOM (định mức từ bảng bom)
        // Logic: order_details.item_id → items.product_id → bom → materials → items (NVL)
        // Trả về item_id của NVL (vì production_material_request_details.material_id FK đến items)
        const result = await query(
            `WITH OrderItems AS (
                SELECT 
                    od.item_id, 
                    od.quantity as order_qty,
                    i.item_type,
                    i.product_id,
                    i.material_id as item_material_id,
                    i.item_name as product_name
                FROM order_details od
                JOIN items i ON od.item_id = i.id
                WHERE od.order_id = $1
            ),
            -- Sản phẩm: lấy định mức từ bảng bom, sau đó map sang items
            ProductBOM AS (
                SELECT 
                    oi.product_name,
                    oi.item_id as product_item_id,
                    item_nvl.id as material_item_id,
                    (oi.order_qty * b.quantity) as quantity,
                    item_nvl.unit
                FROM OrderItems oi
                JOIN bom b ON oi.product_id = b.product_id
                JOIN items item_nvl ON item_nvl.material_id = b.material_id
                WHERE oi.item_type = 'PRODUCT' AND oi.product_id IS NOT NULL
            ),
            -- NVL: nếu item là NVL thì lấy chính item đó
            MaterialDirect AS (
                SELECT 
                    oi.product_name,
                    oi.item_id as product_item_id,
                    oi.item_id as material_item_id,
                    oi.order_qty as quantity,
                    i.unit
                FROM OrderItems oi
                JOIN items i ON oi.item_id = i.id
                WHERE oi.item_type = 'MATERIAL' AND oi.item_material_id IS NOT NULL
            ),
            AllRequirements AS (
                SELECT product_name, product_item_id, material_item_id, quantity, unit FROM ProductBOM
                UNION ALL
                SELECT product_name, product_item_id, material_item_id, quantity, unit FROM MaterialDirect
            )
            SELECT 
                ar.product_name as "productName",
                ar.product_item_id as "productId",
                ar.material_item_id as "materialId",
                i.item_name as "materialName",
                i.item_code as "materialCode",
                i.unit,
                SUM(ar.quantity) as "quantityPlanned"
            FROM AllRequirements ar
            JOIN items i ON ar.material_item_id = i.id
            GROUP BY ar.product_name, ar.product_item_id, ar.material_item_id, i.item_name, i.item_code, i.unit
            ORDER BY ar.product_name, i.item_name`,
            [orderId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get material requirements error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
