import { query } from '@/lib/db';
import { invalidatePermissionCache, requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy permissions của role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền xem permissions
    const { hasPermission, error } = await requirePermission('admin.roles', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem phân quyền'
      }, { status: 403 });
    }

    const { id } = await params;

    // Lấy thông tin role
    const roleResult = await query(
      'SELECT role_name as "roleName" FROM roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy vai trò'
      }, { status: 404 });
    }

    // Kiểm tra nếu là ADMIN
    if (roleResult.rows[0].roleName === 'Quản trị hệ thống' || id === '1') {
      // ADMIN có toàn quyền - lấy tất cả permissions với full quyền
      const result = await query(
        `SELECT 
          p.id, 
          p.permission_code as "permissionCode",
          p.permission_name as "permissionName",
          p.module,
          p.description,
          true as "canView",
          true as "canCreate",
          true as "canEdit",
          true as "canDelete"
         FROM permissions p
         ORDER BY p.module, p.id`
      );
      
      console.log(`[Permissions API] ADMIN Role - Auto granted all ${result.rows.length} permissions`);
      
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          roleName: roleResult.rows[0].roleName,
          permissions: result.rows,
          isAdmin: true,
          note: 'ADMIN có toàn quyền tự động - không cần lưu vào database'
        }
      });
    }

    // Lấy tất cả permissions và trạng thái của role này
    const result = await query(
      `SELECT 
        p.id, 
        p.permission_code as "permissionCode",
        p.permission_name as "permissionName",
        p.module,
        p.description,
        COALESCE(rp.can_view, false) as "canView",
        COALESCE(rp.can_create, false) as "canCreate",
        COALESCE(rp.can_edit, false) as "canEdit",
        COALESCE(rp.can_delete, false) as "canDelete"
       FROM permissions p
       LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = $1
       ORDER BY p.module, p.id`,
      [id]
    );

    console.log(`[Permissions API] Role ID: ${id}, Found ${result.rows.length} permissions`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        roleName: roleResult.rows[0].roleName,
        permissions: result.rows
      }
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// PUT - Cập nhật permissions của role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Kiểm tra quyền chỉnh sửa permissions
    const { hasPermission, error } = await requirePermission('admin.roles', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa phân quyền'
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { permissions } = body;

    console.log(`[Update Permissions] Role ID: ${id}, Updating ${permissions.length} permissions`);

    // Kiểm tra nếu là ADMIN role
    const roleCheck = await query('SELECT role_code FROM roles WHERE id = $1', [id]);
    if (roleCheck.rows.length > 0 && roleCheck.rows[0].role_code === 'ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không thể chỉnh sửa quyền của ADMIN - ADMIN có toàn quyền tự động'
      }, { status: 400 });
    }

    // Xóa tất cả permissions cũ của role
    const deleteResult = await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    console.log(`[Update Permissions] Deleted ${deleteResult.rowCount} old permissions`);

    // Insert permissions mới
    let insertedCount = 0;
    for (const perm of permissions) {
      // Chỉ insert nếu có ít nhất 1 quyền được bật
      if (perm.canView || perm.canCreate || perm.canEdit || perm.canDelete) {
        await query(
          `INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, perm.id, perm.canView, perm.canCreate, perm.canEdit, perm.canDelete]
        );
        insertedCount++;
      }
    }

    console.log(`[Update Permissions] Inserted ${insertedCount} new permissions`);

    // Xóa cache permissions của role này để áp dụng ngay
    invalidatePermissionCache(parseInt(id));

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Cập nhật thành công ${insertedCount} quyền`,
      data: { insertedCount }
    });

  } catch (error) {
    console.error('Update role permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
