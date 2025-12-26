import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    // Kiểm tra quyền xem danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        pc.id, 
        pc.category_code as "categoryCode", 
        pc.category_name as "categoryName",
        pc.parent_id as "parentId",
        pc.description,
        parent.category_name as "parentName"
       FROM product_categories pc
       LEFT JOIN product_categories parent ON parent.id = pc.parent_id
       ORDER BY pc.id`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo danh mục'
      }, { status: 403 });
    }

    const body = await request.json();
    const { categoryCode, categoryName, parentId, description } = body;

    if (!categoryCode || !categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO product_categories (category_code, category_name, parent_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryCode, categoryName, parentId || null, description]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo danh mục thành công'
    });

  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã danh mục đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
