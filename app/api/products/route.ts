import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem sản phẩm
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem sản phẩm'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // ADMIN xem toàn bộ products, user khác chỉ xem products trong chi nhánh của mình
    let productsQuery: string;
    let countQuery: string;
    let queryParams: any[];
    let countParams: any[];

    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      // User không phải ADMIN chỉ xem products trong chi nhánh của mình
      productsQuery = `
        SELECT
          p.id, p.product_code as "productCode", p.product_name as "productName",
          p.category_id as "categoryId", p.description, p.unit, p.cost_price as "costPrice",
          p.is_active as "isActive", p.branch_id as "branchId",
          pc.category_name as "categoryName",
          b.branch_name as "branchName"
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN branches b ON b.id = p.branch_id
        WHERE p.branch_id = $1
        ORDER BY p.id DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [currentUser.branchId, limit, offset];

      countQuery = `SELECT COUNT(*) FROM products p WHERE p.branch_id = $1`;
      countParams = [currentUser.branchId];
    } else {
      // ADMIN xem tất cả products
      productsQuery = `
        SELECT
          p.id, p.product_code as "productCode", p.product_name as "productName",
          p.category_id as "categoryId", p.description, p.unit, p.cost_price as "costPrice",
          p.is_active as "isActive", p.branch_id as "branchId",
          pc.category_name as "categoryName",
          b.branch_name as "branchName"
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN branches b ON b.id = p.branch_id
        ORDER BY p.id DESC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [limit, offset];

      countQuery = `SELECT COUNT(*) FROM products p`;
      countParams = [];
    }

    const result = await query(productsQuery, queryParams);
    const countResult = await query(countQuery, countParams);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        products: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo sản phẩm
    const { hasPermission, user: currentUser, error } = await requirePermission('products.products', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo sản phẩm'
      }, { status: 403 });
    }

    const body = await request.json();
    const { productCode, productName, categoryId, description, unit, costPrice, bom } = body;

    if (!productCode || !productName || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Insert product
    const result = await query(
      `INSERT INTO products (product_code, product_name, category_id, description, unit, cost_price, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, product_code as "productCode", product_name as "productName"`,
      [productCode, productName, categoryId || null, description, unit, costPrice || 0, currentUser.branchId]
    );

    const productId = result.rows[0].id;

    // Insert BOM if provided
    if (bom && Array.isArray(bom) && bom.length > 0) {
      for (const item of bom) {
        await query(
          `INSERT INTO bom (product_id, material_id, quantity, unit, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, item.materialId, item.quantity, item.unit, item.notes]
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo sản phẩm thành công'
    });

  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã sản phẩm đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
