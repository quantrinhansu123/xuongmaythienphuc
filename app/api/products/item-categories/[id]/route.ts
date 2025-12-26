import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('products.categories', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa danh mục'
      }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    let { categoryName, parentId, description } = body;

    if (!categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên danh mục'
      }, { status: 400 });
    }

    // Xử lý parentId - nếu là array thì lấy phần tử đầu
    let finalParentId = null;
    
    // Xử lý array rỗng hoặc undefined
    if (Array.isArray(parentId) && parentId.length === 0) {
      parentId = null;
    }
    
    if (parentId) {
      if (Array.isArray(parentId) && parentId.length > 0) {
        const firstValue = parentId[0];
        if (typeof firstValue === 'string') {
          // Tạo danh mục cha mới
          const parentCode = await query(
            `SELECT 'DM' || LPAD((COALESCE(MAX(SUBSTRING(category_code FROM 3)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
             FROM item_categories`
          );
          
          const newParent = await query(
            `INSERT INTO item_categories (category_code, category_name, parent_id, description)
             VALUES ($1, $2, NULL, $3)
             RETURNING id`,
            [parentCode.rows[0].code, firstValue, `Danh mục cha tự động tạo`]
          );
          
          finalParentId = newParent.rows[0].id;
        } else {
          finalParentId = firstValue;
        }
      } else if (typeof parentId === 'string') {
        // Tạo danh mục cha mới
        const parentCode = await query(
          `SELECT 'DM' || LPAD((COALESCE(MAX(SUBSTRING(category_code FROM 3)::INTEGER), 0) + 1)::TEXT, 4, '0') as code
           FROM item_categories`
        );
        
        const newParent = await query(
          `INSERT INTO item_categories (category_code, category_name, parent_id, description)
           VALUES ($1, $2, NULL, $3)
           RETURNING id`,
          [parentCode.rows[0].code, parentId, `Danh mục cha tự động tạo`]
        );
        
        finalParentId = newParent.rows[0].id;
      } else if (typeof parentId === 'number') {
        finalParentId = parentId;
      }
    }

    const result = await query(
      `UPDATE item_categories 
       SET category_name = $1, parent_id = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryName, finalParentId, description || null, id]
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

  } catch (error: any) {
    console.error('Update item category error:', error);
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
    const { hasPermission, error } = await requirePermission('products.categories', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa danh mục'
      }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Kiểm tra xem có danh mục con không
    const childCheck = await query(
      `SELECT COUNT(*) as count FROM item_categories WHERE parent_id = $1`,
      [id]
    );

    if (parseInt(childCheck.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục có danh mục con'
      }, { status: 400 });
    }

    // Kiểm tra xem có sản phẩm nào đang dùng danh mục này không
    const itemCheck = await query(
      `SELECT COUNT(*) as count FROM items WHERE category_id = $1`,
      [id]
    );

    if (parseInt(itemCheck.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa danh mục đang được sử dụng bởi sản phẩm'
      }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM item_categories WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy danh mục'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa danh mục thành công'
    });

  } catch (error: any) {
    console.error('Delete item category error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
