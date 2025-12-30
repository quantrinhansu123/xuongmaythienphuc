import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy danh sách hệ số giá theo danh mục của nhóm khách hàng
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('sales.customers', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const groupId = parseInt(resolvedParams.id);

        // Lấy tất cả danh mục hàng hóa với hệ số giá (nếu có)
        const result = await query(
            `SELECT 
        ic.id as "categoryId",
        ic.category_code as "categoryCode",
        ic.category_name as "categoryName",
        COALESCE(cgcp.price_multiplier, cg.price_multiplier) as "priceMultiplier",
        CASE WHEN cgcp.id IS NOT NULL THEN true ELSE false END as "isCustom"
       FROM item_categories ic
       LEFT JOIN customer_group_category_prices cgcp 
         ON cgcp.category_id = ic.id AND cgcp.customer_group_id = $1
       LEFT JOIN customer_groups cg ON cg.id = $1
       ORDER BY ic.category_name`,
            [groupId]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get category prices error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

// PUT - Cập nhật hệ số giá theo danh mục (upsert)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('sales.customers', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa'
            }, { status: 403 });
        }

        const resolvedParams = await params;
        const groupId = parseInt(resolvedParams.id);
        const body = await request.json();
        const { categoryPrices } = body; // Array of { categoryId, priceMultiplier }

        if (!Array.isArray(categoryPrices)) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Dữ liệu không hợp lệ'
            }, { status: 400 });
        }

        // Xóa các giá cũ của nhóm này
        await query(
            'DELETE FROM customer_group_category_prices WHERE customer_group_id = $1',
            [groupId]
        );

        // Thêm các hệ số giá mới (chỉ thêm nếu có giá trị custom)
        for (const item of categoryPrices) {
            if (item.priceMultiplier !== null && item.priceMultiplier !== undefined) {
                await query(
                    `INSERT INTO customer_group_category_prices (customer_group_id, category_id, price_multiplier)
           VALUES ($1, $2, $3)
           ON CONFLICT (customer_group_id, category_id) 
           DO UPDATE SET price_multiplier = $3`,
                    [groupId, item.categoryId, parseFloat(item.priceMultiplier)]
                );
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Cập nhật hệ số giá thành công'
        });

    } catch (error) {
        console.error('Update category prices error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
