import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('inventory.import', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền hủy phiếu'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    // Kiểm tra phiếu
    const transCheck = await query(
      `SELECT id, status FROM inventory_transactions WHERE id = $1`,
      [transactionId]
    );

    if (transCheck.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy phiếu'
      }, { status: 404 });
    }

    if (transCheck.rows[0].status !== 'PENDING') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ có thể hủy phiếu đang chờ duyệt'
      }, { status: 400 });
    }

    // Cập nhật trạng thái thành CANCELLED
    await query(
      `UPDATE inventory_transactions 
       SET status = 'CANCELLED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [currentUser.id, transactionId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Đã hủy phiếu'
    });

  } catch (error) {
    console.error('Reject import error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
