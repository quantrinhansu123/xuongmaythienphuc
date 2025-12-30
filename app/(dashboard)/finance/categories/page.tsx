'use client';

import CategorySidePanel from '@/components/CategorySidePanel';
import Modal from '@/components/Modal';
import WrapperContent from '@/components/WrapperContent';
import { useFileExport } from '@/hooks/useFileExport';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useState } from 'react';

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
  description: string;
  isActive: boolean;
  createdAt: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  bankAccountId?: number;
  bankName?: string;
  bankAccountNumber?: string;
}

interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function FinancialCategoriesPage() {
  const { can } = usePermissions();
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FinancialCategory | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    sourceCategoryId: '',
    targetCategoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    type: 'THU' as 'THU' | 'CHI',
    description: '',
    bankAccountId: undefined as number | undefined,
  });

  useEffect(() => {
    fetchCategories();
    fetchBankAccounts();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts');
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCategory
        ? `/api/finance/categories/${editingCategory.id}`
        : '/api/finance/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert(editingCategory ? 'Cập nhật thành công!' : 'Tạo sổ quỹ thành công!');
        setShowModal(false);
        resetForm();
        fetchCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    setFormData({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      type: category.type,
      description: category.description,
      bankAccountId: category.bankAccountId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa sổ quỹ này?')) return;

    try {
      const res = await fetch(`/api/finance/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('Xóa thành công!');
        fetchCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryCode: '',
      categoryName: '',
      type: 'THU',
      description: '',
      bankAccountId: undefined,
    });
    setEditingCategory(null);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.sourceCategoryId === transferData.targetCategoryId) {
      alert('Quỹ nguồn và đích phải khác nhau');
      return;
    }

    try {
      const res = await fetch('/api/finance/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Luân chuyển thành công!');
        setShowTransferModal(false);
        setTransferData({
          sourceCategoryId: '',
          targetCategoryId: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        fetchCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
    setFilterType('ALL');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const exportColumns = [
    { title: 'Mã sổ quỹ', dataIndex: 'categoryCode', key: 'categoryCode' },
    { title: 'Tên sổ quỹ', dataIndex: 'categoryName', key: 'categoryName' },
    { title: 'Loại', dataIndex: 'type', key: 'type' },
    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
  ];
  const { exportToXlsx } = useFileExport(exportColumns);

  const handleExportExcel = () => {
    exportToXlsx(filteredCategories, 'danh-muc-tai-chinh');
  };

  const filteredCategories = categories.filter(cat => {
    const searchKey = 'search,categoryCode,categoryName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue ||
      cat.categoryCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      cat.categoryName.toLowerCase().includes(searchValue.toLowerCase());

    const typeValue = filterQueries['type'];
    const matchType = !typeValue || cat.type === typeValue;

    const statusValue = filterQueries['isActive'];
    const matchStatus = statusValue === undefined || cat.isActive === (statusValue === 'true');

    return matchSearch && matchType && matchStatus;
  });

  return (
    <>
      <WrapperContent<FinancialCategory>
        title="Sổ quỹ"
        isNotAccessible={!can('finance.categories', 'view')}
        isLoading={loading}
        header={{
          buttonEnds: can('finance.categories', 'create')
            ? [
              {
                type: 'default',
                name: 'Đặt lại',
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
              {
                type: 'primary',
                name: 'Thêm',
                onClick: () => {
                  resetForm();
                  setShowModal(true);
                },
                icon: <PlusOutlined />,
              },
              {
                type: 'primary',
                name: 'Luân chuyển',
                onClick: () => setShowTransferModal(true),
                icon: <ReloadOutlined />, // Using Reload icon for transfer
                className: 'bg-orange-500 hover:bg-orange-600 border-orange-500' // Custom color
              },
              {
                type: 'default',
                name: 'Xuất Excel',
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
            ]
            : [
              {
                type: 'default',
                name: 'Đặt lại',
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
            ],
          searchInput: {
            placeholder: 'Tìm theo mã, tên sổ quỹ...',
            filterKeys: ['categoryCode', 'categoryName'],
          },
          customToolbar: (
            <div className="flex gap-2 items-center">
              <Select
                style={{ width: 100 }}
                placeholder="Loại"
                allowClear
                size="middle"
                value={filterQueries['type']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, type: value });
                  } else {
                    const { type, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Tất cả', value: 'ALL' },
                  { label: 'Thu', value: 'THU' },
                  { label: 'Chi', value: 'CHI' },
                ]}
              />
              <Select
                style={{ width: 130 }}
                placeholder="Trạng thái"
                allowClear
                size="middle"
                value={filterQueries['isActive']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, isActive: value });
                  } else {
                    const { isActive, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Hoạt động', value: 'true' },
                  { label: 'Ngừng', value: 'false' },
                ]}
              />
            </div>
          ),
        }}
      >
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sổ quỹ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TK Liên kết</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng thu</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng chi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{category.categoryCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>{category.categoryName}</div>
                    <div className="text-xs text-gray-500">{category.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {category.bankName ? (
                      <div>
                        <div className="font-medium">{category.bankName}</div>
                        <div className="text-xs">{category.bankAccountNumber}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                    {formatCurrency(category.totalIn)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                    {formatCurrency(category.totalOut)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                    {formatCurrency(category.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {category.isActive ? 'Hoạt động' : 'Ngừng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingCategory ? 'Sửa sổ quỹ' : 'Thêm sổ quỹ'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingCategory ? (
            <div>
              <label className="block text-sm font-medium mb-1">Mã sổ quỹ</label>
              <input
                type="text"
                value={formData.categoryCode}
                className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Mã sổ quỹ <span className="text-gray-400 font-normal">(để trống sẽ tự động tạo)</span></label>
              <input
                type="text"
                value={formData.categoryCode}
                onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="VD: THU001, CHI001..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Tên sổ quỹ *</label>
            <input
              type="text"
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'THU' | 'CHI' })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="THU">Thu</option>
              <option value="CHI">Chi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tài khoản mặc định (Tự động chọn khi giao dịch)</label>
            <Select
              value={formData.bankAccountId}
              onChange={(value) => setFormData({ ...formData, bankAccountId: value })}
              className="w-full"
              allowClear
              placeholder="Chọn tài khoản ngân hàng..."
              options={bankAccounts.map(acc => ({
                label: `${acc.bankName} - ${acc.accountNumber}`,
                value: acc.id
              }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingCategory ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Luân chuyển quỹ"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Từ quỹ nguồn (Chi)</label>
            <Select
              className="w-full"
              value={transferData.sourceCategoryId ? Number(transferData.sourceCategoryId) : undefined}
              onChange={(val) => setTransferData({ ...transferData, sourceCategoryId: val?.toString() || '' })}
              placeholder="Chọn quỹ nguồn"
              options={categories.map(c => ({
                label: `${c.categoryName} (Dư: ${formatCurrency(c.balance)})`,
                value: c.id
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Đến quỹ đích (Thu)</label>
            <Select
              className="w-full"
              value={transferData.targetCategoryId ? Number(transferData.targetCategoryId) : undefined}
              onChange={(val) => setTransferData({ ...transferData, targetCategoryId: val?.toString() || '' })}
              placeholder="Chọn quỹ đích"
              options={categories.map(c => ({
                label: c.categoryName,
                value: c.id,
                disabled: c.id.toString() === transferData.sourceCategoryId
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Số tiền</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded"
              value={transferData.amount}
              onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
              required
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ngày giao dịch</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={transferData.date}
              onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              className="w-full px-3 py-2 border rounded"
              value={transferData.description}
              onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Xác nhận chuyển
            </button>
          </div>
        </form>
      </Modal>

      {/* Side Panel */}
      {selectedCategory && (
        <CategorySidePanel
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onUpdate={fetchCategories}
        />
      )}
    </>
  );
}
