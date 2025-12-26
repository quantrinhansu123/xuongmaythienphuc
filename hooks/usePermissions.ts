import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface Permission {
  permissionCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface PermissionsData {
  isAdmin: boolean;
  permissions: Permission[];
}

export const usePermissions = () => {
  const { data, isLoading } = useQuery<PermissionsData>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await fetch('/api/auth/permissions');
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || 'Failed to fetch permissions');
      }
      return {
        isAdmin: body.data.isAdmin || false,
        permissions: body.data.permissions || [],
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const permissions = useMemo(() => data?.permissions || [], [data?.permissions]);
  const isAdmin = data?.isAdmin || false;

  // Tạo map để lookup nhanh hơn
  const permissionMap = useMemo(() => {
    const map = new Map<string, Permission>();
    for (const p of permissions) {
      map.set(p.permissionCode, p);
    }
    return map;
  }, [permissions]);

  // Memoize hàm can để tránh re-render
  const can = useCallback((permissionCode: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (isAdmin) return true;

    const permission = permissionMap.get(permissionCode);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  }, [isAdmin, permissionMap]);

  return { permissions, isAdmin, loading: isLoading, can };
};
