import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import React, { useEffect, useState } from 'react';

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
  description: string;
  isActive: boolean;
  createdAt: string;
  bankAccountId?: number;
  bankName?: string;
  bankAccountNumber?: string;
}

interface Props {
  category: FinancialCategory;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CategorySidePanel({ category, onClose, onUpdate }: Props) {
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    categoryCode: category.categoryCode,
    categoryName: category.categoryName,
    type: category.type,
    description: category.description,
    bankAccountId: category.bankAccountId,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts');
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [category.id]);

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Fetch relevant transactions based on category type
      const endpoint = `/api/finance/cashbooks?categoryId=${category.id}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error(error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/finance/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công!');
        setIsEditing(false);
        onUpdate();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa sổ quỹ này?')) return;
    try {
      const res = await fetch(`/api/finance/categories/${category.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công!');
        onClose();
        onUpdate();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">Chi tiết sổ quỹ</h2>
          <p className="text-sm text-gray-600">{category.categoryCode}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-6">
        {!isEditing ? (
          <>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Mã sổ quỹ:</span>
                <span className="font-medium">{category.categoryCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tên sổ quỹ:</span>
                <span className="font-medium">{category.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Loại:</span>
                <span className={`px-2 py-1 rounded text-xs ${category.type === 'THU' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {category.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Mô tả:</span>
                <span className="font-medium">{category.description || '-'}</span>
              </div>
              {category.bankName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">TK liên kết:</span>
                  <span className="font-medium text-blue-600">
                    {category.bankName} - {category.bankAccountNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <span className={`px-2 py-1 rounded text-xs ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {category.isActive ? 'Hoạt động' : 'Ngừng'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngày tạo:</span>
                <span className="font-medium">
                  {new Date(category.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngày tạo:</span>
                <span className="font-medium">
                  {new Date(category.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Fund Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-gray-500 mb-1 text-xs">Tổng thu</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(transactions.filter(t => t.transactionType === 'THU').reduce((sum, t) => sum + Number(t.amount), 0))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-gray-500 mb-1 text-xs">Tổng chi</div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(transactions.filter(t => t.transactionType === 'CHI').reduce((sum, t) => sum + Number(t.amount), 0))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-gray-500 mb-1 text-xs">Số dư</div>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(
                    transactions.reduce((sum, t) => sum + (t.transactionType === 'THU' ? Number(t.amount) : -Number(t.amount)), 0)
                  )}
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Lịch sử giao dịch</h3>
              {loadingTransactions ? (
                <div className="text-center py-4">Đang tải...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                  Chưa có giao dịch
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <div className="font-medium">
                          {new Date(t.transactionDate).toLocaleDateString('vi-VN')} - {t.transactionCode}
                        </div>
                        <div className="text-gray-500 text-xs truncate max-w-[200px]">
                          {t.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${t.transactionType === 'THU' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.transactionType === 'THU' ? '+' : '-'}{formatCurrency(t.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {can('finance.categories', 'edit') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sửa
                </button>
              )}
              {can('finance.categories', 'delete') && (
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Xóa
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã sổ quỹ</label>
              <input
                type="text"
                value={formData.categoryCode}
                onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên sổ quỹ</label>
              <input
                type="text"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Loại</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'THU' | 'CHI' })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="THU">THU</option>
                <option value="CHI">CHI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tài khoản mặc định</label>
              <select
                value={formData.bankAccountId || ''}
                onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- Không chọn --</option>
                {bankAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
