import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT 
        p.id, p.product_code as "productCode", p.product_name as "productName",
        p.category_id as "categoryId", p.description, p.unit, p.cost_price as "costPrice",
        p.is_active as "isActive", p.branch_id as "branchId",
        pc.category_name as "categoryName",
        b.branch_name as "branchName"
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       LEFT JOIN branches b ON b.id = p.branch_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get product error:', error);
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
    // Kiểm tra quyền sửa sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền sửa sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { productName, categoryId, description, unit, costPrice, bom } = body;

    // Update product
    const result = await query(
      `UPDATE products 
       SET product_name = $1, category_id = $2, description = $3, unit = $4, cost_price = $5
       WHERE id = $6
       RETURNING id, product_code as "productCode", product_name as "productName"`,
      [productName, categoryId || null, description, unit, costPrice || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy sản phẩm'
      }, { status: 404 });
    }

    // Update BOM
    await query('DELETE FROM bom WHERE product_id = $1', [id]);
    
    if (bom && Array.isArray(bom) && bom.length > 0) {
      for (const item of bom) {
        await query(
          `INSERT INTO bom (product_id, material_id, quantity, unit, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.materialId, item.quantity, item.unit, item.notes]
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật sản phẩm thành công'
    });

  } catch (error) {
    console.error('Update product error:', error);
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
    // Kiểm tra quyền xóa sản phẩm
    const { hasPermission, error } = await requirePermission('products.products', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa sản phẩm'
      }, { status: 403 });
    }

    const { id } = await params;
    
    // Delete BOM first
    await query('DELETE FROM bom WHERE product_id = $1', [id]);
    
    // Delete product
    await query('DELETE FROM products WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
