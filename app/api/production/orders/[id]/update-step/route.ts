import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền cập nhật'
            }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { step } = body;

        const validSteps = ['MATERIAL_IMPORT', 'CUTTING', 'SEWING', 'FINISHING', 'QC', 'WAREHOUSE_IMPORT'];
        if (!validSteps.includes(step)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Bước không hợp lệ'
            }, { status: 400 });
        }

        await query(
            `UPDATE production_orders SET current_step = $1, updated_at = NOW() WHERE id = $2`,
            [step, id]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Cập nhật bước thành công'
        });

    } catch (error) {
        console.error('Update step error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
