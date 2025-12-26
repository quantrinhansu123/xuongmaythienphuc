'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface BalanceItem {
  warehouseId: number;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  itemType: 'NVL' | 'THANH_PHAM';
  quantity: number;
  unit: string;
}

export default function BalancePage() {
  const { can } = usePermissions();
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [view, setView] = useState<'detail' | 'summary'>('detail');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/balance');
      const data = await res.json();
      if (data.success) {
        setBalances(data.data.details);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!can('inventory.balance', 'view')) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Báo cáo tồn kho</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('detail')}
            className={`px-4 py-2 rounded-lg ${view === 'detail' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Chi tiết theo kho
          </button>
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg ${view === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Tổng hợp
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        ) : view === 'detail' ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {balances.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{item.warehouseName}</td>
                  <td className="px-6 py-4 text-sm font-mono">{item.itemCode}</td>
                  <td className="px-6 py-4 text-sm">{item.itemName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      item.itemType === 'NVL' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.itemType === 'NVL' ? 'NVL' : 'Thành phẩm'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold">{item.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tồn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{item.itemCode}</td>
                  <td className="px-6 py-4 text-sm font-medium">{item.itemName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      item.itemType === 'NVL' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.itemType === 'NVL' ? 'NVL' : 'Thành phẩm'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                    {item.totalQuantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
