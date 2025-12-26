import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.products', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem định mức'
            }, { status: 403 });
        }
        const { id } = await params;

        const result = await query(
            `SELECT 
        pm.material_id as "materialId",
        m.item_name as "materialName",
        m.item_code as "materialCode",
        m.unit,
        pm.quantity
       FROM product_materials pm
       JOIN items m ON pm.material_id = m.id
       WHERE pm.item_id = $1`,
            [id]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get product materials error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.products', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa định mức'
            }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { materials } = body; // { materialId, quantity }[]

        if (!Array.isArray(materials)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            }, { status: 400 });
        }

        await query('BEGIN');

        try {
            // Delete existing
            await query('DELETE FROM product_materials WHERE item_id = $1', [id]);

            // Insert new
            for (const m of materials) {
                if (m.materialId && m.quantity > 0) {
                    await query(
                        `INSERT INTO product_materials (item_id, material_id, quantity)
             VALUES ($1, $2, $3)`,
                        [id, m.materialId, m.quantity]
                    );
                }
            }

            await query('COMMIT');

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Cập nhật định mức thành công'
            });

        } catch (err) {
            await query('ROLLBACK');
            throw err;
        }

    } catch (error) {
        console.error('Update product materials error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
