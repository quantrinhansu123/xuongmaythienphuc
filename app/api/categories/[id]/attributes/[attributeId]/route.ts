import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update attribute
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; attributeId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa thuộc tính'
            }, { status: 403 });
        }

        const { attributeId } = await params;
        const body = await request.json();
        const { attributeName, attributeType, options, isRequired } = body;

        if (!attributeName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng nhập tên thuộc tính'
            }, { status: 400 });
        }

        // Ensure options is an array
        const optionsArray = Array.isArray(options) ? options : [];

        const result = await query(
            `UPDATE category_attributes 
       SET attribute_name = $1, attribute_type = $2, is_required = $3, options = $4
       WHERE id = $5
       RETURNING id, attribute_name as "attributeName", attribute_type as "attributeType", is_required as "isRequired", options`,
            [attributeName, attributeType || 'text', isRequired || false, JSON.stringify(optionsArray), attributeId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy thuộc tính'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
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

// DELETE - Delete attribute
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; attributeId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'delete');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xóa thuộc tính'
            }, { status: 403 });
        }

        const { attributeId } = await params;

        const result = await query(
            `DELETE FROM category_attributes WHERE id = $1 RETURNING id`,
            [attributeId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy thuộc tính'
            }, { status: 404 });
        }

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
