'use client';

import CategorySidePanel from '@/components/CategorySidePanel';
import CommonTable from '@/components/CommonTable';
import Modal from '@/components/Modal';
import WrapperContent from '@/components/WrapperContent';
import useColumn from '@/hooks/useColumn';
import { useFileExport } from '@/hooks/useFileExport';
import useFilter from '@/hooks/useFilter';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Select, TableColumnsType, Tag } from 'antd';
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
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

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
    const dataToExport = filteredCategories.map(item => ({
      ...item,
      type: item.type === 'THU' ? 'Thu' : 'Chi',
      isActive: item.isActive ? 'Hoạt động' : 'Ngừng',
      // Ensure amounts are numbers
      totalIn: item.totalIn,
      totalOut: item.totalOut,
      balance: item.balance,
    }));
    exportToXlsx(dataToExport, 'danh-muc-tai-chinh');
  };

  const filteredCategories = applyFilter(categories);

  const defaultColumns: TableColumnsType<FinancialCategory> = [
    {
      title: 'Mã',
      dataIndex: 'categoryCode',
      key: 'categoryCode',
      width: 120,
    },
    {
      title: 'Tên sổ quỹ',
      key: 'categoryName',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.categoryName}</div>
          <div className="text-xs text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: 'TK Liên kết',
      key: 'bankAccount',
      width: 180,
      render: (_, record) => {
        if (record.bankName) {
          return (
            <div className="text-blue-600">
              <div className="font-medium">{record.bankName}</div>
              <div className="text-xs">{record.bankAccountNumber}</div>
            </div>
          );
        }
        return <span className="text-gray-400 text-xs">-</span>;
      },
    },
    {
      title: 'Tổng thu',
      dataIndex: 'totalIn',
      key: 'totalIn',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="text-green-600 font-medium">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: 'Tổng chi',
      dataIndex: 'totalOut',
      key: 'totalOut',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="text-red-600 font-medium">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: 'Số dư',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <span className="font-bold text-blue-600">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

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
                icon: <ReloadOutlined />,
                className: 'bg-orange-500 hover:bg-orange-600 border-orange-500'
              },
              {
                type: 'default',
                name: 'Xuất Excel',
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
            ]
            : undefined,
          searchInput: {
            placeholder: 'Tìm theo mã, tên sổ quỹ...',
            filterKeys: ['categoryCode', 'categoryName'],
          },
          filters: {
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          customToolbar: (
            <div className="flex gap-2 items-center">
              <Select
                style={{ width: 100 }}
                placeholder="Loại"
                allowClear
                size="middle"
                value={query['type']}
                onChange={(value) => updateQueries([{ key: 'type', value }])}
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
                value={query['isActive']}
                onChange={(value) => updateQueries([{ key: 'isActive', value }])}
                options={[
                  { label: 'Hoạt động', value: 'true' },
                  { label: 'Ngừng', value: 'false' },
                ]}
              />
            </div>
          ),
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          columns={getVisibleColumns()}
          dataSource={filteredCategories as FinancialCategory[]}
          loading={loading}
          onRowClick={(record: FinancialCategory) => setSelectedCategory(record)}
          paging={true}
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
          total={filteredCategories.length}
        />
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
