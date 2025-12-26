import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// PUT - Cập nhật danh mục tài chính
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'edit');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { categoryName, type, description, isActive } = body;

    const result = await query(
      `UPDATE financial_categories 
      SET 
        category_name = COALESCE($1, category_name),
        type = COALESCE($2, type),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        type,
        description,
        is_active as "isActive",
        created_at as "createdAt"`,
      [categoryName, type, description, isActive, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating financial category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Xóa danh mục tài chính
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.categories', 'delete');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await query(
      'DELETE FROM financial_categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa danh mục thành công',
    });
  } catch (error: any) {
    console.error('Error deleting financial category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
