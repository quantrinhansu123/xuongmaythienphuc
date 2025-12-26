import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem hàng hoá'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        i.id,
        i.item_code as "itemCode",
        i.item_name as "itemName",
        i.item_type as "itemType",
        i.product_id as "productId",
        i.material_id as "materialId",
        i.unit,
        i.cost_price as "costPrice",
        i.is_active as "isActive",
        i.brand,
        i.model,
        i.color,
        i.size,
        i.length,
        i.width,
        i.height,
        i.weight,
        i.thickness,
        i.other_specs as "otherSpecs"
       FROM items i
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy hàng hoá'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get item error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa hàng hoá'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      itemName, categoryId, unit, costPrice, isActive, isSellable,
      brand, model, color, size, length, width, height, weight, thickness, otherSpecs
    } = body;

    const result = await query(
      `UPDATE items 
       SET item_name = COALESCE($1, item_name),
           category_id = $2,
           unit = COALESCE($3, unit),
           cost_price = COALESCE($4, cost_price),
           is_active = COALESCE($5, is_active),
           is_sellable = COALESCE($6, is_sellable),
           brand = $7,
           model = $8,
           color = $9,
           size = $10,
           length = $11,
           width = $12,
           height = $13,
           weight = $14,
           thickness = $15,
           other_specs = $16
       WHERE id = $17
       RETURNING id, item_code as "itemCode", item_name as "itemName", is_sellable as "isSellable"`,
      [
        itemName, categoryId, unit, costPrice, isActive, isSellable,
        brand, model, color, size, length, width, height, weight, thickness, otherSpecs,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy hàng hoá'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật hàng hoá thành công'
    });

  } catch (error) {
    console.error('Update item error:', error);
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
    const { hasPermission, error } = await requirePermission('products', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa hàng hoá'
      }, { status: 403 });
    }

    const { id } = await params;

    // Check if item is used in orders
    const checkUsage = await query(
      `SELECT COUNT(*) as count FROM order_details WHERE item_id = $1`,
      [id]
    );

    if (parseInt(checkUsage.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa hàng hoá đã được sử dụng trong đơn hàng'
      }, { status: 400 });
    }

    await query('DELETE FROM items WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa hàng hoá thành công'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
