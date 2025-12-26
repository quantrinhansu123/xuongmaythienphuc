import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// API đồng bộ (enable) hàng hoá cho các chi nhánh khác
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền đồng bộ hàng hoá'
      }, { status: 403 });
    }

    // Chỉ ADMIN mới được đồng bộ
    if (currentUser.roleCode !== 'ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ Admin mới có quyền đồng bộ hàng hoá'
      }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds, branchIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn ít nhất 1 hàng hoá'
      }, { status: 400 });
    }

    if (!branchIds || !Array.isArray(branchIds) || branchIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng chọn ít nhất 1 chi nhánh'
      }, { status: 400 });
    }

    await query('BEGIN');

    try {
      let syncedCount = 0;
      let skippedCount = 0;

      for (const itemId of itemIds) {
        for (const branchId of branchIds) {
          // Kiểm tra đã có trong branch_items chưa
          const existing = await query(
            'SELECT id, is_available FROM branch_items WHERE item_id = $1 AND branch_id = $2',
            [itemId, branchId]
          );

          if (existing.rows.length > 0) {
            // Đã tồn tại - nếu đang disable thì enable lại
            if (!existing.rows[0].is_available) {
              await query(
                'UPDATE branch_items SET is_available = true, updated_at = NOW() WHERE id = $1',
                [existing.rows[0].id]
              );
              syncedCount++;
            } else {
              skippedCount++;
            }
          } else {
            // Chưa có - tạo mới
            await query(
              `INSERT INTO branch_items (item_id, branch_id, is_available)
               VALUES ($1, $2, true)`,
              [itemId, branchId]
            );
            syncedCount++;
          }
        }
      }

      await query('COMMIT');

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { syncedCount, skippedCount },
        message: `Đồng bộ thành công ${syncedCount} hàng hoá${skippedCount > 0 ? `, bỏ qua ${skippedCount} (đã có)` : ''}`
      });

    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }

  } catch (error: any) {
    console.error('Sync items error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}
