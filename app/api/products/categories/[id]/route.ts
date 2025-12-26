import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền sửa danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { categoryName, parentId, description } = body;

    const result = await query(
      `UPDATE product_categories 
       SET category_name = $1, parent_id = $2, description = $3
       WHERE id = $4
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryName, parentId || null, description, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy danh mục'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật danh mục thành công'
    });

  } catch (error) {
    console.error('Update category error:', error);
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
    // Kiểm tra quyền xóa danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa danh mục'
      }, { status: 403 });
    }

    const { id } = await params;
    
    // Kiểm tra xem có sản phẩm nào đang dùng danh mục này không
    const checkProducts = await query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1',
      [id]
    );

    if (parseInt(checkProducts.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục đang có sản phẩm'
      }, { status: 400 });
    }

    await query('DELETE FROM product_categories WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa danh mục thành công'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
