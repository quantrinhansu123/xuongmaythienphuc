import { getCurrentUser } from './auth';
import { query } from './db';

export interface Permission {
  permissionCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ============================================
// SERVER-SIDE PERMISSION CACHE
// Cache permissions trong memory để tránh query database mỗi request
// ============================================
interface CacheEntry {
  permissions: Permission[];
  timestamp: number;
}

const permissionCache = new Map<number, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

/**
 * Xóa cache của một role (gọi khi cập nhật permissions)
 */
export const invalidatePermissionCache = (roleId?: number) => {
  if (roleId) {
    permissionCache.delete(roleId);
  } else {
    permissionCache.clear();
  }
};

/**
 * Lấy danh sách permissions của một role từ database
 * CHỈ LẤY NHỮNG PERMISSIONS ĐÃ ĐƯỢC CẤP (có trong role_permissions)
 * CHÚ Ý: ADMIN không cần gọi hàm này vì có toàn quyền tự động
 * 
 * ĐÃ TỐI ƯU: Cache permissions trong memory
 */
export const getUserPermissions = async (
  roleId: number
): Promise<Permission[]> => {
  // Kiểm tra cache
  const cached = permissionCache.get(roleId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  const result = await query(
    `SELECT 
      p.permission_code as "permissionCode",
      rp.can_view as "canView",
      rp.can_create as "canCreate",
      rp.can_edit as "canEdit",
      rp.can_delete as "canDelete"
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.module, p.permission_code`,
    [roleId]
  );
  
  // Lưu vào cache
  permissionCache.set(roleId, {
    permissions: result.rows,
    timestamp: Date.now()
  });
  
  return result.rows;
};

/**
 * Kiểm tra một permission cụ thể trong danh sách permissions
 */
export const checkPermission = (
  permissions: Permission[],
  permissionCode: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): boolean => {
  const permission = permissions.find(
    (p) => p.permissionCode === permissionCode
  );
  if (!permission) return false;

  switch (action) {
    case 'view':
      return permission.canView;
    case 'create':
      return permission.canCreate;
    case 'edit':
      return permission.canEdit;
    case 'delete':
      return permission.canDelete;
    default:
      return false;
  }
};

/**
 * Hàm kiểm tra quyền cho API routes
 * 
 * LOGIC:
 * 1. Kiểm tra đăng nhập
 * 2. ADMIN → Toàn quyền (bypass database check)
 * 3. Role khác → Kiểm tra trong role_permissions
 * 
 * @param permissionCode - Mã quyền (vd: 'admin.users', 'products.products')
 * @param action - Hành động ('view' | 'create' | 'edit' | 'delete')
 * @returns Object chứa hasPermission, user, và error (nếu có)
 */
export const requirePermission = async (
  permissionCode: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<{ hasPermission: boolean; user: any; error?: string }> => {
  // Bước 1: Kiểm tra đăng nhập
  const user = await getCurrentUser();

  if (!user) {
    return {
      hasPermission: false,
      user: null,
      error: 'Chưa đăng nhập',
    };
  }

  // Bước 2: ADMIN có toàn quyền - KHÔNG CẦN KIỂM TRA DATABASE
  if (user.roleCode === 'ADMIN') {
    return { hasPermission: true, user };
  }

  // Bước 3: Kiểm tra quyền của role trong database (đã được cache)
  const permissions = await getUserPermissions(user.roleId);
  const hasPermission = checkPermission(permissions, permissionCode, action);

  if (!hasPermission) {
    return {
      hasPermission: false,
      user,
      error: `Không có quyền ${action} cho ${permissionCode}`,
    };
  }

  return { hasPermission: true, user };
};

/**
 * Lấy tất cả permissions trong hệ thống (dùng cho trang phân quyền)
 */
export const getAllPermissions = async (): Promise<
  Array<{
    id: number;
    permissionCode: string;
    permissionName: string;
    module: string;
    description: string;
  }>
> => {
  const result = await query(
    `SELECT 
      id,
      permission_code as "permissionCode",
      permission_name as "permissionName",
      module,
      description
    FROM permissions
    ORDER BY module, permission_code`
  );
  return result.rows;
};
