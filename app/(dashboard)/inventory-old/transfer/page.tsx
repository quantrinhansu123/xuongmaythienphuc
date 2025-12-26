'use client';

import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

export default function TransferPage() {
  const router = useRouter();
  const { can } = usePermissions();

  if (!can('inventory.transfer', 'view')) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔄 Luân chuyển kho</h1>
        {can('inventory.transfer', 'create') && (
          <button
            onClick={() => router.push('/inventory/transfer/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            ➕ Tạo phiếu chuyển
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Danh sách phiếu chuyển kho</p>
      </div>
    </div>
  );
}
