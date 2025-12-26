import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

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

/**
 * Hook permissions tối ưu - Không block UI khi loading
 * Sử dụng cache và optimistic updates
 */
export const useOptimisticPermissions = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<PermissionsData>({
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
    staleTime: 10 * 60 * 1000, // Cache 10 phút (tăng từ 5 phút)
    gcTime: 30 * 60 * 1000, // Giữ cache 30 phút
    refetchOnWindowFocus: false, // Không refetch khi focus window
    refetchOnMount: false, // Không refetch khi mount nếu có cache
  });

  // Prefetch permissions khi app khởi động
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['permissions'],
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  const permissions = data?.permissions || [];
  const isAdmin = data?.isAdmin || false;

  // Optimistic check - Giả sử có quyền nếu đang loading và có cache cũ
  const can = (
    permissionCode: string, 
    action: 'view' | 'create' | 'edit' | 'delete',
    optimistic = true
  ): boolean => {
    // ADMIN có toàn quyền
    if (isAdmin) return true;

    // Nếu đang loading lần đầu và không có data, return false
    if (isLoading && !data && !optimistic) {
      return false;
    }

    // Nếu đang loading nhưng có cache cũ, dùng cache (optimistic)
    if (isLoading && data && optimistic) {
      // Dùng data cũ để không block UI
    }

    const permission = permissions.find(p => p.permissionCode === permissionCode);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  };

  return { 
    permissions, 
    isAdmin, 
    loading: isLoading && !data, // Chỉ loading nếu chưa có data
    isFetching, // Đang fetch nhưng có thể có data cũ
    can 
  };
};

/**
 * Hook để prefetch permissions trước khi cần
 * Gọi trong layout hoặc root component
 */
export const usePrefetchPermissions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch ngay khi app load
    queryClient.prefetchQuery({
      queryKey: ['permissions'],
      queryFn: async () => {
        const res = await fetch('/api/auth/permissions');
        const body = await res.json();
        return {
          isAdmin: body.data?.isAdmin || false,
          permissions: body.data?.permissions || [],
        };
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);
};
