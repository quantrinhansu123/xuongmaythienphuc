import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nhà cung cấp'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { supplierName, phone, email, address, supplierGroupId } = body;

    await query(
      `UPDATE suppliers 
       SET supplier_name = $1, phone = $2, email = $3, address = $4,
           supplier_group_id = $5
       WHERE id = $6`,
      [supplierName, phone || null, email || null, address || null, supplierGroupId || null, supplierId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update supplier error:', error);
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
    const { hasPermission, error } = await requirePermission('purchasing.suppliers', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nhà cung cấp'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);

    const checkPO = await query(
      'SELECT id FROM purchase_orders WHERE supplier_id = $1 LIMIT 1',
      [supplierId]
    );

    if (checkPO.rows.length > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa nhà cung cấp đã có đơn đặt hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM suppliers WHERE id = $1', [supplierId]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa thành công'
    });

  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
