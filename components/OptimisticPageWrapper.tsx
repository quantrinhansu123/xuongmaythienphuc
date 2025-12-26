'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { ReactNode } from 'react';
import LoaderApp from './LoaderApp';

interface OptimisticPageWrapperProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredAction?: 'view' | 'create' | 'edit' | 'delete';
  fallback?: ReactNode;
  showLoadingOverlay?: boolean;
}

/**
 * Wrapper tối ưu cho trang - Hiển thị UI trước, kiểm tra quyền sau
 * Giúp trang load nhanh hơn, không bị "đơ" khi chuyển trang
 */
export default function OptimisticPageWrapper({
  children,
  requiredPermission,
  requiredAction = 'view',
  fallback,
  showLoadingOverlay = false,
}: OptimisticPageWrapperProps) {
  const { can, loading, isAdmin } = usePermissions();

  // Nếu không yêu cầu permission, render ngay
  if (!requiredPermission) {
    return <>{children}</>;
  }

  // QUAN TRỌNG: Render UI ngay, không chờ loading
  // Chỉ hiển thị overlay loading nhẹ nếu cần
  const hasPermission = isAdmin || can(requiredPermission, requiredAction);

  // Nếu đang loading và chưa có data, hiển thị skeleton hoặc loading nhẹ
  if (loading && !hasPermission && !isAdmin) {
    if (showLoadingOverlay) {
      return (
        <div className="relative">
          {/* Render children ngay để tránh "đơ" */}
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          {/* Overlay loading nhẹ */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <LoaderApp />
          </div>
        </div>
      );
    }
    
    // Hoặc chỉ hiển thị loading đơn giản
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderApp />
      </div>
    );
  }

  // Nếu không có quyền, hiển thị fallback hoặc thông báo
  if (!loading && !hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500">
            Bạn không có quyền {requiredAction === 'view' ? 'xem' : requiredAction === 'create' ? 'tạo' : requiredAction === 'edit' ? 'sửa' : 'xóa'} nội dung này
          </p>
        </div>
      </div>
    );
  }

  // Có quyền, render children
  return <>{children}</>;
}

/**
 * HOC để wrap component với OptimisticPageWrapper
 */
export function withOptimisticPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string,
  requiredAction: 'view' | 'create' | 'edit' | 'delete' = 'view'
) {
  return function WrappedComponent(props: P) {
    return (
      <OptimisticPageWrapper
        requiredPermission={requiredPermission}
        requiredAction={requiredAction}
      >
        <Component {...props} />
      </OptimisticPageWrapper>
    );
  };
}
