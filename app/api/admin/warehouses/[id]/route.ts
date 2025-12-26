import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa kho'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { warehouseName, branchId, address, warehouseType, isActive } = body;

    const result = await query(
      `UPDATE warehouses 
       SET warehouse_name = $1, branch_id = $2, address = $3, warehouse_type = $4, is_active = $5
       WHERE id = $6
       RETURNING id, warehouse_code as "warehouseCode", warehouse_name as "warehouseName"`,
      [warehouseName, branchId, address, warehouseType, isActive, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy kho'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật kho thành công'
    });

  } catch (error) {
    console.error('Update warehouse error:', error);
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
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa kho'
      }, { status: 403 });
    }

    const { id } = await params;
    await query('DELETE FROM warehouses WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa kho thành công'
    });

  } catch (error) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
