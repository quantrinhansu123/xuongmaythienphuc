import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET: Lấy lịch sử nhập kho thành phẩm cho đơn sản xuất
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền'
            }, { status: 403 });
        }

        const { id } = await params;

        const result = await query(
            `SELECT 
                pfi.id,
                pfi.production_order_id as "productionOrderId",
                pfi.warehouse_id as "warehouseId",
                w.warehouse_name as "warehouseName",
                pfi.item_id as "itemId",
                i.item_code as "itemCode",
                i.item_name as "itemName",
                pfi.quantity,
                pfi.notes,
                pfi.created_at as "createdAt",
                u.full_name as "createdByName"
            FROM production_finished_imports pfi
            JOIN warehouses w ON pfi.warehouse_id = w.id
            JOIN items i ON pfi.item_id = i.id
            LEFT JOIN users u ON pfi.created_by = u.id
            WHERE pfi.production_order_id = $1
            ORDER BY pfi.created_at DESC`,
            [id]
        );

        // Tính tổng đã nhập
        const totalResult = await query(
            `SELECT COALESCE(SUM(quantity), 0) as "totalImported"
            FROM production_finished_imports
            WHERE production_order_id = $1`,
            [id]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                imports: result.rows,
                totalImported: Number(totalResult.rows[0]?.totalImported || 0)
            }
        });

    } catch (error) {
        console.error('Get finished imports error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
