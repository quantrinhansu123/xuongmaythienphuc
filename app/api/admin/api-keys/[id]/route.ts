import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT: Cập nhật API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.api-keys', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa'
      }, { status: 403 });
    }

    const { id } = await params;
    const { keyName, description, isActive, permissions, rateLimit, expiresAt } = await request.json();

    const result = await query(
      `UPDATE api_keys 
       SET key_name = COALESCE($1, key_name),
           description = $2,
           is_active = COALESCE($3, is_active),
           permissions = COALESCE($4, permissions),
           rate_limit = COALESCE($5, rate_limit),
           expires_at = $6
       WHERE id = $7
       RETURNING id, key_name as "keyName", is_active as "isActive"`,
      [
        keyName,
        description,
        isActive,
        permissions ? JSON.stringify(permissions) : null,
        rateLimit,
        expiresAt,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy API key'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thành công'
    });

  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// DELETE: Xóa API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('admin.api-keys', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa'
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy API key'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa API key thành công'
    });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
