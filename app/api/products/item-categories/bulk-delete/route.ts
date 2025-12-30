import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { hasPermission, error } = await requirePermission('products.categories', 'delete');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xóa danh mục'
            }, { status: 403 });
        }

        const body = await request.json();
        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng chọn ít nhất một danh mục'
            }, { status: 400 });
        }

        const results = {
            deleted: [] as number[],
            deactivated: [] as number[],
            failed: [] as { id: number; reason: string }[]
        };

        for (const id of ids) {
            try {
                // Kiểm tra xem có danh mục con không
                const childCheck = await query(
                    `SELECT COUNT(*) as count FROM item_categories WHERE parent_id = $1`,
                    [id]
                );

                if (parseInt(childCheck.rows[0].count) > 0) {
                    // Có danh mục con, không thể xóa -> đánh dấu ngưng
                    await query(
                        `UPDATE item_categories 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
                        [id]
                    );
                    results.deactivated.push(id);
                    continue;
                }

                // Kiểm tra xem có sản phẩm nào đang dùng danh mục này không
                const itemCheck = await query(
                    `SELECT COUNT(*) as count FROM items WHERE category_id = $1`,
                    [id]
                );

                if (parseInt(itemCheck.rows[0].count) > 0) {
                    // Có sản phẩm đang dùng, không thể xóa -> đánh dấu ngưng
                    await query(
                        `UPDATE item_categories 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
                        [id]
                    );
                    results.deactivated.push(id);
                    continue;
                }

                // Không có ràng buộc, có thể xóa
                const deleteResult = await query(
                    `DELETE FROM item_categories WHERE id = $1 RETURNING id`,
                    [id]
                );

                if (deleteResult.rows.length > 0) {
                    results.deleted.push(id);
                } else {
                    results.failed.push({ id, reason: 'Không tìm thấy danh mục' });
                }

            } catch (error: any) {
                console.error(`Error processing category ${id}:`, error);
                // Nếu xóa thất bại vì bất kỳ lý do gì, thử đánh dấu ngưng
                try {
                    await query(
                        `UPDATE item_categories 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
                        [id]
                    );
                    results.deactivated.push(id);
                } catch (updateError) {
                    results.failed.push({ id, reason: error.message || 'Lỗi không xác định' });
                }
            }
        }

        // Tạo thông báo kết quả
        const messages = [];
        if (results.deleted.length > 0) {
            messages.push(`Đã xóa ${results.deleted.length} danh mục`);
        }
        if (results.deactivated.length > 0) {
            messages.push(`Đã ngưng ${results.deactivated.length} danh mục (không thể xóa do có ràng buộc)`);
        }
        if (results.failed.length > 0) {
            messages.push(`Thất bại ${results.failed.length} danh mục`);
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: results,
            message: messages.join('. ')
        });

    } catch (error: any) {
        console.error('Bulk delete item categories error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
