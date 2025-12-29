import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const categoryId = parseInt(resolvedParams.id);

        const result = await query(
            `SELECT id, category_id as "categoryId", measurement_name as "measurementName", 
                    unit, is_required as "isRequired"
       FROM category_measurements 
       WHERE category_id = $1 
       ORDER BY id`,
            [categoryId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get measurements error:', error);
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
        const { hasPermission, error } = await requirePermission('products.categories', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const categoryId = parseInt(resolvedParams.id);
        const body = await request.json();
        const { measurementName, unit, isRequired = false } = body;

        if (!measurementName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Tên thông số là bắt buộc'
            }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO category_measurements (category_id, measurement_name, unit, is_required)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [categoryId, measurementName, unit, isRequired]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create measurement error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const measurementId = searchParams.get('id');
        const body = await request.json();
        const { measurementName, unit, isRequired } = body;

        if (!measurementId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'ID thông số là bắt buộc'
            }, { status: 400 });
        }

        await query(
            `UPDATE category_measurements 
             SET measurement_name = COALESCE($1, measurement_name),
                 unit = COALESCE($2, unit),
                 is_required = COALESCE($3, is_required)
             WHERE id = $4`,
            [measurementName, unit, isRequired, measurementId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'delete');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const measurementId = searchParams.get('id');

        if (!measurementId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'ID thông số là bắt buộc'
            }, { status: 400 });
        }

        await query(
            `DELETE FROM category_measurements WHERE id = $1`,
            [measurementId]
        );

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
