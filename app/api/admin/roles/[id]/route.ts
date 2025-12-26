import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xóa role
    const { hasPermission, error } = await requirePermission('admin.roles', 'delete');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xóa vai trò'
      }, { status: 403 });
    }

    const { id } = await params;

    // Kiểm tra có user nào đang dùng role này không
    const checkUsers = await query(
      'SELECT COUNT(*) FROM users WHERE role_id = $1',
      [id]
    );

    if (parseInt(checkUsers.rows[0].count) > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể xóa vai trò đang được sử dụng'
      }, { status: 400 });
    }

    // Xóa permissions trước
    await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    
    // Xóa role
    await query('DELETE FROM roles WHERE id = $1', [id]);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Xóa vai trò thành công'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
