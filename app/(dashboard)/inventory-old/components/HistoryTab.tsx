'use client';

import { useEffect, useState } from 'react';

interface HistoryTabProps {
  warehouseId: number;
}

interface Transaction {
  id: number;
  transactionCode: string;
  transactionType: string;
  fromWarehouseName: string;
  toWarehouseName: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export default function HistoryTab({ warehouseId }: HistoryTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [warehouseId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/history?warehouseId=${warehouseId}`);
      const data = await res.json();
      if (data.success) setTransactions(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { icon: string; label: string; color: string }> = {
      NHAP: { icon: '📥', label: 'Nhập kho', color: 'text-green-600' },
      XUAT: { icon: '📤', label: 'Xuất kho', color: 'text-red-600' },
      CHUYEN: { icon: '🔄', label: 'Chuyển kho', color: 'text-blue-600' },
    };
    return labels[type] || { icon: '📋', label: type, color: 'text-gray-600' };
  };

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">📜 Lịch sử giao dịch</h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📜</div>
          <div>Chưa có giao dịch nào</div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Mã phiếu</th>
              <th className="px-3 py-2 text-left">Loại</th>
              <th className="px-3 py-2 text-left">Từ kho</th>
              <th className="px-3 py-2 text-left">Đến kho</th>
              <th className="px-3 py-2 text-left">Người tạo</th>
              <th className="px-3 py-2 text-left">Ngày tạo</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((t, idx) => {
              const typeInfo = getTypeLabel(t.transactionType);
              return (
                <tr key={`history-${t.id}-${idx}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{t.transactionCode}</td>
                  <td className="px-3 py-2">
                    <span className={typeInfo.color}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.fromWarehouseName || '-'}</td>
                  <td className="px-3 py-2">{t.toWarehouseName || '-'}</td>
                  <td className="px-3 py-2">{t.createdBy}</td>
                  <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
