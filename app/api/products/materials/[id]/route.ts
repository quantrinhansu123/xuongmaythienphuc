import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền sửa nguyên vật liệu
    const { hasPermission, error } = await requirePermission('products.materials', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa nguyên vật liệu'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { materialName, unit, description } = body;

    const result = await query(
      `UPDATE materials 
       SET material_name = $1, unit = $2, description = $3
       WHERE id = $4
       RETURNING id, material_code as "materialCode", material_name as "materialName"`,
      [materialName, unit, description, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy NVL'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật NVL thành công'
    });

  } catch (error) {
    console.error('Update material error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa nguyên vật liệu
    const { hasPermission, error } = await requirePermission('products.materials', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa nguyên vật liệu'
      }, { status: 403 });
    }

    const { id } = await params;
    
    // Kiểm tra xem NVL có đang được dùng trong BOM không
    const checkBom = await query(
      'SELECT COUNT(*) FROM bom WHERE material_id = $1',
      [id]
    );

    if (parseInt(checkBom.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa NVL đang được sử dụng trong định mức sản phẩm'
      }, { status: 400 });
    }

    await query('DELETE FROM materials WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa NVL thành công'
    });

  } catch (error) {
    console.error('Delete material error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
