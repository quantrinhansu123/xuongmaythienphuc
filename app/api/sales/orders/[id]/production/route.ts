import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('sales.orders', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền cập nhật sản xuất'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { step } = body;

    const validSteps = ['cutting', 'sewing', 'finishing', 'quality_check'];
    if (!validSteps.includes(step)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Bước sản xuất không hợp lệ'
      }, { status: 400 });
    }

    // Lấy production hiện tại
    const currentResult = await query(
      `SELECT production_status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn hàng'
      }, { status: 404 });
    }

    const currentProduction = currentResult.rows[0].production_status || {
      cutting: false,
      sewing: false,
      finishing: false,
      quality_check: false
    };

    // Toggle bước
    currentProduction[step] = !currentProduction[step];

    // Cập nhật
    await query(
      `UPDATE orders 
       SET production_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(currentProduction), orderId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update production error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
