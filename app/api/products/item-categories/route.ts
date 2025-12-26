import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('products.categories', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem danh mục'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT
        ic.id,
        ic.category_code as "categoryCode",
        ic.category_name as "categoryName",
        ic.parent_id as "parentId",
        ic.description,
        ic.is_active as "isActive",
        ic.created_at as "createdAt",
        parent.category_name as "parentName"
       FROM item_categories ic
       LEFT JOIN item_categories parent ON ic.parent_id = parent.id
       ORDER BY COALESCE(parent.category_name, ic.category_name), ic.parent_id NULLS FIRST, ic.category_name`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get item categories error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// Helper function để tạo mã danh mục mới
async function generateCategoryCode(): Promise<string> {
  const codeResult = await query(
    `SELECT 'DM' || LPAD((COALESCE(MAX(CASE 
       WHEN category_code ~ '^DM[0-9]+$' 
       THEN SUBSTRING(category_code FROM 3)::INTEGER 
       ELSE 0 
     END), 0) + 1)::TEXT, 4, '0') as code
     FROM item_categories`
  );
  return codeResult.rows[0].code;
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('products.categories', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo danh mục'
      }, { status: 403 });
    }

    const body = await request.json();
    const { categoryName, parentId, description } = body;

    if (!categoryName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên danh mục'
      }, { status: 400 });
    }

    // Xử lý parentId - chỉ nhận ID số, không tạo mới
    let finalParentId: number | null = null;
    
    if (parentId) {
      const numValue = typeof parentId === 'number' ? parentId : parseInt(parentId);
      if (!isNaN(numValue)) {
        // Kiểm tra danh mục cha có tồn tại không
        const existing = await query(
          `SELECT id FROM item_categories WHERE id = $1 AND parent_id IS NULL`,
          [numValue]
        );
        if (existing.rows.length > 0) {
          finalParentId = numValue;
        }
      }
    }

    // Tạo mã tự động
    const categoryCode = await generateCategoryCode();

    const result = await query(
      `INSERT INTO item_categories (category_code, category_name, parent_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category_code as "categoryCode", category_name as "categoryName"`,
      [categoryCode, categoryName, finalParentId, description || null]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo danh mục thành công'
    });

  } catch (error: unknown) {
    console.error('Create item category error:', error);
    const dbError = error as { code?: string };
    if (dbError.code === '23505') {
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
