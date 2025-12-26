import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { hasPermission } = await requirePermission('inventory.balance', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không có quyền xem tồn kho'
            }, { status: 403 });
        }

        const body = await request.json();
        const { items } = body; // Array of { productId, materialId, quantity }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            }, { status: 400 });
        }

        // Get all warehouses
        const warehousesResult = await query(
            `SELECT w.id, w.warehouse_name as "warehouseName", b.branch_name as "branchName"
             FROM warehouses w
             LEFT JOIN branches b ON w.branch_id = b.id
             WHERE w.is_active = true
             ORDER BY b.branch_name, w.warehouse_name`
        );

        const warehouses = warehousesResult.rows;
        const result = [];

        // Check stock for each warehouse
        for (const warehouse of warehouses) {
            const warehouseItems = [];
            let canFulfill = true;

            for (const item of items) {
                const { productId, materialId, quantity } = item;

                // Get stock for this item in this warehouse
                const stockResult = await query(
                    `SELECT 
                        COALESCE(ib.quantity, 0) as quantity,
                        COALESCE(i.item_name, p.product_name, m.material_name) as "itemName"
                     FROM (SELECT 1) dummy
                     LEFT JOIN inventory_balances ib ON ib.warehouse_id = $1 
                        AND (ib.product_id = $2 OR ib.material_id = $3)
                     LEFT JOIN items i ON i.id = $2 OR i.id = $3
                     LEFT JOIN products p ON p.id = $2
                     LEFT JOIN materials m ON m.id = $3`,
                    [warehouse.id, productId, materialId]
                );

                const available = parseFloat(stockResult.rows[0]?.quantity || 0);
                const required = parseFloat(quantity);
                const itemName = stockResult.rows[0]?.itemName || 'Unknown';

                warehouseItems.push({
                    itemName,
                    available,
                    required,
                });

                if (available < required) {
                    canFulfill = false;
                }
            }

            result.push({
                warehouseId: warehouse.id,
                warehouseName: warehouse.warehouseName,
                branchName: warehouse.branchName,
                canFulfill,
                items: warehouseItems,
            });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Check stock all warehouses error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
