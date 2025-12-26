import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bomId: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products.products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa định mức sản phẩm'
      }, { status: 403 });
    }

    const { id, bomId } = await params;

    await query(
      'DELETE FROM bom WHERE id = $1 AND product_id = $2',
      [bomId, id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa định mức thành công'
    });

  } catch (error) {
    console.error('Delete BOM error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
