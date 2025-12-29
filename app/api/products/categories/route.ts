import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem danh mục
    const { hasPermission, error } = await requirePermission('products.categories', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let queryStr = `SELECT 
        pc.id, 
        pc.category_code as "categoryCode", 
        pc.category_name as "categoryName",
        pc.parent_id as "parentId",
        pc.description,
        pc.parent_id as "parentId",
        pc.description,
        COALESCE(pc.type, 'PRODUCT') as "type",
        pc.is_active as "isActive",
        parent.category_name as "parentName",
        COUNT(DISTINCT i.id) as "itemCount"
       FROM product_categories pc
       LEFT JOIN product_categories parent ON parent.id = pc.parent_id
       LEFT JOIN items i ON i.category_id = pc.id`;

    const params: any[] = [];
    if (type) {
      queryStr += ` WHERE pc.type = $1`;
      params.push(type);
    }

    queryStr += ` GROUP BY pc.id, parent.category_name ORDER BY pc.id`;

    const result = await query(queryStr, params);

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
    const { categoryCode, categoryName, parentId, description, type = 'PRODUCT' } = body;

    if (!categoryCode || !categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO product_categories (category_code, category_name, parent_id, description, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category_code as "categoryCode", category_name as "categoryName", type`,
      [categoryCode, categoryName, parentId || null, description, type]
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
