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

        // Fetch material export history (from production_material_requests)
        const result = await query(
            `SELECT 
                pmr.id as "requestId",
                pmr.created_at as "date",
                w.warehouse_name as "warehouseName",
                pmrd.quantity_actual as "quantityActual",
                i.item_name as "materialName",
                i.item_code as "materialCode",
                i.unit
            FROM production_material_requests pmr
            JOIN production_material_request_details pmrd ON pmr.id = pmrd.request_id
            JOIN items i ON pmrd.material_id = i.id
            LEFT JOIN warehouses w ON pmr.warehouse_id = w.id
            WHERE pmr.production_order_id = $1
            ORDER BY pmr.created_at DESC`,
            [id]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get material exports error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
