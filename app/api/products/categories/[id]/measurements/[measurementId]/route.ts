import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update measurement
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa thông số'
            }, { status: 403 });
        }

        const { measurementId } = await params;
        const body = await request.json();
        const { measurementName, unit, isRequired } = body;

        if (!measurementName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng nhập tên thông số'
            }, { status: 400 });
        }

        const result = await query(
            `UPDATE category_measurements 
       SET measurement_name = $1, unit = $2, is_required = $3
       WHERE id = $4
       RETURNING id, measurement_name as "measurementName", unit, is_required as "isRequired"`,
            [measurementName, unit || 'cm', isRequired || false, measurementId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy thông số'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
            message: 'Cập nhật thông số thành công'
        });

    } catch (error) {
        console.error('Update measurement error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

// DELETE - Delete measurement
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; measurementId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'delete');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xóa thông số'
            }, { status: 403 });
        }

        const { measurementId } = await params;

        const result = await query(
            `DELETE FROM category_measurements WHERE id = $1 RETURNING id`,
            [measurementId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy thông số'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Xóa thông số thành công'
        });

    } catch (error) {
        console.error('Delete measurement error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
