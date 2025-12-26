import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem BOM (định mức)
    const { hasPermission, error } = await requirePermission('products.bom', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem định mức sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        b.id,
        b.material_id as "materialId",
        b.quantity,
        b.unit,
        b.notes,
        m.material_code as "materialCode",
        m.material_name as "materialName"
       FROM bom b
       JOIN materials m ON m.id = b.material_id
       WHERE b.product_id = $1
       ORDER BY b.id`,
      [id]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get BOM error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products.products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa định mức sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { materialId, quantity, unit, notes } = body;

    if (!materialId || !quantity) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin'
      }, { status: 400 });
    }

    // Kiểm tra xem đã có định mức cho NVL này chưa
    const existing = await query(
      'SELECT id FROM bom WHERE product_id = $1 AND material_id = $2',
      [id, materialId]
    );

    if (existing.rows.length > 0) {
      // Cập nhật nếu đã tồn tại
      await query(
        'UPDATE bom SET quantity = $1, unit = $2, notes = $3 WHERE product_id = $4 AND material_id = $5',
        [quantity, unit || '', notes || '', id, materialId]
      );
    } else {
      // Thêm mới
      await query(
        'INSERT INTO bom (product_id, material_id, quantity, unit, notes) VALUES ($1, $2, $3, $4, $5)',
        [id, materialId, quantity, unit || '', notes || '']
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Lưu định mức thành công'
    });

  } catch (error) {
    console.error('Save BOM error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
