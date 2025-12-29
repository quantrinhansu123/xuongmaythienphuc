import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update template
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ templateId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa mẫu sản phẩm'
            }, { status: 403 });
        }

        const { templateId } = await params;
        const body = await request.json();
        const { templateName, attributeValues, measurementValues, isActive } = body;

        if (!templateName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng nhập tên mẫu'
            }, { status: 400 });
        }

        const result = await query(
            `UPDATE category_templates 
       SET template_name = $1, 
           attribute_values = $2, 
           measurement_values = $3, 
           is_active = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, template_code as "templateCode", template_name as "templateName"`,
            [templateName, JSON.stringify(attributeValues || {}), JSON.stringify(measurementValues || {}), isActive ?? true, templateId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy mẫu'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
            message: 'Cập nhật mẫu thành công'
        });

    } catch (error) {
        console.error('Update category template error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

// DELETE - Delete template
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ templateId: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'delete');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xóa mẫu sản phẩm'
            }, { status: 403 });
        }

        const { templateId } = await params;

        const result = await query(
            `DELETE FROM category_templates WHERE id = $1 RETURNING id`,
            [templateId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy mẫu'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Xóa mẫu thành công'
        });

    } catch (error) {
        console.error('Delete category template error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
