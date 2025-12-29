import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - List templates for a category
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem mẫu sản phẩm'
            }, { status: 403 });
        }

        const { id: categoryId } = await params;

        const result = await query(
            `SELECT 
        id,
        category_id as "categoryId",
        template_code as "templateCode",
        template_name as "templateName",
        attribute_values as "attributeValues",
        measurement_values as "measurementValues",
        is_active as "isActive",
        created_at as "createdAt"
       FROM category_templates
       WHERE category_id = $1
       ORDER BY template_name`,
            [categoryId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get category templates error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

// POST - Create new template
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền tạo mẫu sản phẩm'
            }, { status: 403 });
        }

        const { id: categoryId } = await params;
        const body = await request.json();
        const { templateName, attributeValues, measurementValues } = body;

        if (!templateName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng nhập tên mẫu'
            }, { status: 400 });
        }

        // Generate template code
        const codeResult = await query(
            `SELECT 'MAU' || LPAD((COALESCE(MAX(CASE 
         WHEN template_code ~ '^MAU[0-9]+$' 
         THEN SUBSTRING(template_code FROM 4)::INTEGER 
         ELSE 0 
       END), 0) + 1)::TEXT, 4, '0') as code
       FROM category_templates WHERE category_id = $1`,
            [categoryId]
        );
        const templateCode = codeResult.rows[0].code;

        const result = await query(
            `INSERT INTO category_templates (category_id, template_code, template_name, attribute_values, measurement_values)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, template_code as "templateCode", template_name as "templateName"`,
            [categoryId, templateCode, templateName, JSON.stringify(attributeValues || {}), JSON.stringify(measurementValues || {})]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
            message: 'Tạo mẫu thành công'
        });

    } catch (error: unknown) {
        console.error('Create category template error:', error);
        const dbError = error as { code?: string };
        if (dbError.code === '23505') {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Mã mẫu đã tồn tại'
            }, { status: 400 });
        }
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
