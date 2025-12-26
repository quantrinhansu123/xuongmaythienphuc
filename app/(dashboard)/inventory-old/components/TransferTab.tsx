'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface TransferTabProps {
  warehouseId: number;
  warehouseType: 'NVL' | 'THANH_PHAM';
}

export default function TransferTab({ warehouseId, warehouseType }: TransferTabProps) {
  const { can } = usePermissions();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [warehouseId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/transfer?warehouseId=${warehouseId}`);
      const data = await res.json();
      if (data.success) setTransactions(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Luân chuyển kho</h3>
        {can('inventory.transfer', 'create') ? (
          <button 
            onClick={() => {
              console.log('Transfer button clicked');
              setShowCreateForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Tạo phiếu chuyển
          </button>
        ) : (
          <div className="text-sm text-gray-500">Không có quyền tạo phiếu</div>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🔄</div>
          <div>Chưa có phiếu chuyển kho nào</div>
          <div className="text-sm mt-2">Chuyển hàng từ kho này sang kho khác</div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div>Danh sách phiếu chuyển (đang phát triển)</div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Tạo phiếu chuyển kho</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-lg mb-2">Chức năng luân chuyển kho</div>
              <div className="text-sm">Đang phát triển...</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
