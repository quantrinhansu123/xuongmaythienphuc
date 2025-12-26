import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('sales.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const categoryId = parseInt(resolvedParams.id);

        const result = await query(
            `SELECT * FROM category_attributes 
       WHERE category_id = $1 
       ORDER BY id`,
            [categoryId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get attributes error:', error);
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
        const { hasPermission, error } = await requirePermission('sales.orders', 'edit'); // Using edit permission for now
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const categoryId = parseInt(resolvedParams.id);
        const body = await request.json();
        const { attributeName, attributeType = 'TEXT', isRequired = false } = body;

        if (!attributeName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Tên thuộc tính là bắt buộc'
            }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO category_attributes (category_id, attribute_name, attribute_type, is_required)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [categoryId, attributeName, attributeType, isRequired]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create attribute error:', error);
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
        const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('id');

        if (!attributeId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'ID thuộc tính là bắt buộc'
            }, { status: 400 });
        }

        await query(
            `DELETE FROM category_attributes WHERE id = $1`,
            [attributeId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Xóa thuộc tính thành công'
        });

    } catch (error) {
        console.error('Delete attribute error:', error);
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
        const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền chỉnh sửa'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('id');
        const body = await request.json();
        const { attributeName, attributeType, isRequired } = body;

        if (!attributeId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'ID thuộc tính là bắt buộc'
            }, { status: 400 });
        }

        await query(
            `UPDATE category_attributes 
             SET attribute_name = COALESCE($1, attribute_name),
                 attribute_type = COALESCE($2, attribute_type),
                 is_required = COALESCE($3, is_required)
             WHERE id = $4`,
            [attributeName, attributeType, isRequired, attributeId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Cập nhật thuộc tính thành công'
        });

    } catch (error) {
        console.error('Update attribute error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
