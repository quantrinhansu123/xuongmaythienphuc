'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

export default function ExportPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (can('inventory.export', 'view')) {
      fetchTransactions();
    }
  }, [filter]);

  const fetchTransactions = async () => {
    const res = await fetch(`/api/inventory/export?status=${filter}`);
    const data = await res.json();
    if (data.success) setTransactions(data.data);
  };

  if (!can('inventory.export', 'view')) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📤 Xuất kho</h1>
        {can('inventory.export', 'create') && (
          <button
            onClick={() => router.push('/inventory/export/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            ➕ Tạo phiếu xuất
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Danh sách phiếu xuất kho (Tương tự nhập kho)</p>
      </div>
    </div>
  );
}
