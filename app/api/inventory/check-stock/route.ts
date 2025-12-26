import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { hasPermission, error } = await requirePermission('inventory.balance', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem tồn kho'
            }, { status: 403 });
        }

        const body = await request.json();
        const { warehouseId, items } = body;

        if (!warehouseId || !items || !Array.isArray(items)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            }, { status: 400 });
        }

        const results = [];

        for (const item of items) {
            const { productId, materialId } = item;

            if (!productId && !materialId) continue;

            const res = await query(
                `SELECT quantity FROM inventory_balances 
         WHERE warehouse_id = $1 
         AND product_id IS NOT DISTINCT FROM $2 
         AND material_id IS NOT DISTINCT FROM $3`,
                [warehouseId, productId || null, materialId || null]
            );

            results.push({
                productId,
                materialId,
                quantity: res.rows.length > 0 ? parseFloat(res.rows[0].quantity) : 0
            });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Check stock error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
