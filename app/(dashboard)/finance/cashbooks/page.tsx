'use client';

import CashbookSidePanel from '@/components/CashbookSidePanel';
import CommonTable from '@/components/CommonTable';
import Modal from '@/components/Modal';
import WrapperContent from '@/components/WrapperContent';
import { useFileExport } from '@/hooks/useFileExport';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { ArrowDownOutlined, ArrowUpOutlined, CalendarOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, DatePicker, Segmented, Select, TableColumnsType, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;

interface CashBook {
  id: number;
  transactionCode: string;
  transactionDate: string;
  amount: number;
  transactionType: 'THU' | 'CHI';
  paymentMethod: 'CASH' | 'BANK' | 'TRANSFER';
  description: string;
  categoryName: string;
  categoryCode: string;
  categoryId: number;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountId?: number;
  createdByName: string;
  branchName: string;
  branchId: number;
  createdAt: string;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

interface User {
  id: number;
  username: string;
  roleCode: string;
  branchId: number | null;
}

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

export default function CashBooksPage() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const [cashbooks, setCashbooks] = useState<CashBook[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCashbook, setSelectedCashbook] = useState<CashBook | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);

  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'ALL' | 'CASH' | 'BANK' | 'TRANSFER'>('ALL');
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);

  const [formData, setFormData] = useState({
    transactionCode: '',
    transactionDate: new Date().toISOString().split('T')[0],
    financialCategoryId: '',
    amount: '',
    transactionType: 'THU' as 'THU' | 'CHI',
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'TRANSFER',
    bankAccountId: '',
    description: '',
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
    fetchCategories();
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchCashbooks();
    }
  }, [dateRange, selectedBranchId, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.user);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const fetchCashbooks = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const branchParam = selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : '';

      const res = await fetch(`/api/finance/cashbooks?startDate=${startDate}&endDate=${endDate}${branchParam}`);
      const data = await res.json();
      if (data.success) {
        setCashbooks(data.data);
      }
    } catch (error) {
      console.error('Error fetching cashbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/categories?isActive=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts?isActive=true');
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
      const res = await fetch('/api/finance/cashbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          financialCategoryId: parseInt(formData.financialCategoryId),
          bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo phiếu thu/chi thành công!');
        setShowModal(false);
        resetForm();
        fetchCashbooks();
        fetchBankAccounts(); // Refresh để cập nhật số dư
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving cashbook:', error);
      alert('Có lỗi xảy ra');
    }
  };



  const resetForm = () => {
    setFormData({
      transactionCode: '',
      transactionDate: new Date().toISOString().split('T')[0],
      financialCategoryId: '',
      amount: '',
      transactionType: 'THU',
      paymentMethod: 'CASH',
      bankAccountId: '',
      description: '',
    });
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
    setFilterType('ALL');
    setFilterPaymentMethod('ALL');
  };

  const exportColumns = [
    { title: 'Mã GD', dataIndex: 'transactionCode', key: 'transactionCode' },
    { title: 'Ngày', dataIndex: 'transactionDate', key: 'transactionDate' },
    { title: 'Loại', dataIndex: 'transactionType', key: 'transactionType' },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount' },
    { title: 'PT thanh toán', dataIndex: 'paymentMethod', key: 'paymentMethod' },
    { title: 'Sổ quỹ', dataIndex: 'categoryName', key: 'categoryName' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    { title: 'Tài khoản', dataIndex: 'bankAccountNumber', key: 'bankAccountNumber' },
    { title: 'Ngân hàng', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Chi nhánh', dataIndex: 'branchName', key: 'branchName' },
    { title: 'Người tạo', dataIndex: 'createdByName', key: 'createdByName' },
  ];
  const { exportToXlsx } = useFileExport(exportColumns);

  const handleExportExcel = () => {
    exportToXlsx(filteredCashbooks, 'so-quy');
  };

  const filteredCashbooks = cashbooks.filter(cb => {
    const searchKey = 'search,transactionCode,categoryName,description';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue ||
      cb.transactionCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      cb.categoryName.toLowerCase().includes(searchValue.toLowerCase()) ||
      cb.description?.toLowerCase().includes(searchValue.toLowerCase());

    const typeValue = filterQueries['transactionType'];
    const matchType = !typeValue || cb.transactionType === typeValue;

    const methodValue = filterQueries['paymentMethod'];
    const matchMethod = !methodValue || cb.paymentMethod === methodValue;

    const bankAccountValue = filterQueries['bankAccountId'];
    const matchBankAccount = !bankAccountValue || cb.bankAccountId === parseInt(bankAccountValue);

    return matchSearch && matchType && matchMethod && matchBankAccount;
  });

  const handleBulkDelete = async (ids: React.Key[]) => {
    try {
      for (const id of ids) {
        const res = await fetch(`/api/finance/cashbooks/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      message.success(`Đã xóa ${ids.length} phiếu thu/chi`);
      fetchCashbooks();
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const columns: TableColumnsType<CashBook> = [
    {
      title: 'Mã GD',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      width: 120,
    },
    {
      title: 'Ngày',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Sổ quỹ',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 150,
    },
    {
      title: 'Loại',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'THU' ? 'green' : 'red'}>
          {type === 'THU' ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {type}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: 'Tài khoản',
      key: 'account',
      width: 150,
      render: (_, record: CashBook) => {
        if (record.paymentMethod === 'CASH') {
          return <Tag>Tiền mặt</Tag>;
        }
        if (record.bankAccountNumber) {
          return (
            <div>
              <div className="font-medium text-blue-600">{record.bankName}</div>
              <div className="text-xs text-gray-500">...{record.bankAccountNumber.slice(-4)}</div>
            </div>
          );
        }
        return '-';
      },
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 200,
    },
  ];

  const totalThu = filteredCashbooks
    .filter(cb => cb.transactionType === 'THU')
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const totalChi = filteredCashbooks
    .filter(cb => cb.transactionType === 'CHI')
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const filteredCategories = categories.filter(cat => cat.type === formData.transactionType);

  return (
    <>
      <WrapperContent<CashBook>
        title="Thu chi"
        isNotAccessible={!can('finance.cashbooks', 'view')}
        isLoading={loading}
        header={{
          customToolbar: (
            <div className="flex gap-2 items-center flex-nowrap">
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                size="middle"
                style={{ width: 230 }}
                suffixIcon={<CalendarOutlined />}
                presets={[
                  { label: 'Hôm nay', value: [dayjs(), dayjs()] },
                  { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs()] },
                  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
                  { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                ]}
              />
              {isAdmin && (
                <Select
                  style={{ width: 120 }}
                  placeholder="Chi nhánh"
                  size="middle"
                  value={selectedBranchId}
                  onChange={(value: number | 'all') => setSelectedBranchId(value)}
                  options={[
                    { label: 'Tất cả CN', value: 'all' },
                    ...branches.map((b) => ({
                      label: b.branchName,
                      value: b.id,
                    })),
                  ]}
                />
              )}
              <Segmented
                options={[
                  { label: 'Tất cả', value: 'ALL' },
                  { label: (<span><ArrowDownOutlined className="text-green-600" /> Thu</span>), value: 'THU' },
                  { label: (<span><ArrowUpOutlined className="text-red-600" /> Chi</span>), value: 'CHI' },
                ]}
                value={filterQueries['transactionType'] || 'ALL'}
                onChange={(value: any) => {
                  if (value === 'ALL') {
                    const { transactionType, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  } else {
                    setFilterQueries({ ...filterQueries, transactionType: value });
                  }
                }}
              />
              <Select
                style={{ width: 140 }}
                placeholder="Tài khoản"
                allowClear
                size="middle"
                value={filterQueries['bankAccountId']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, bankAccountId: value });
                  } else {
                    const { bankAccountId, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={bankAccounts.map(ba => ({
                  label: `${ba.bankName} - ${ba.accountNumber.slice(-4)}`,
                  value: ba.id.toString(),
                }))}
              />
            </div>
          ),
          buttonEnds: can('finance.cashbooks', 'create')
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
            placeholder: 'Tìm theo mã GD, sổ quỹ, mô tả...',
            filterKeys: ['transactionCode', 'categoryName', 'description'],
            suggestions: {
              apiEndpoint: '/api/finance/cashbooks',
              labelKey: 'transactionCode',
              descriptionKey: 'categoryName',
            },
          },
          filters: {
            query: filterQueries,
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                if (value) newQueries[key] = value;
                else delete newQueries[key];
              });
              setFilterQueries(newQueries);
            },
            onReset: () => setFilterQueries({}),
          },
        }}
      >
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1">Tổng thu</div>
              <div className="text-2xl font-bold text-green-700">
                {totalThu.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 mb-1">Tổng chi</div>
              <div className="text-2xl font-bold text-red-700">
                {totalChi.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Chênh lệch</div>
              <div className={`text-2xl font-bold ${totalThu - totalChi >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {(totalThu - totalChi).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* Table */}
          <CommonTable
            columns={columns}
            dataSource={filteredCashbooks}
            loading={loading}
            onRowClick={(record: CashBook) => setSelectedCashbook(record)}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: setSelectedIds,
            }}
            onBulkDelete={handleBulkDelete}
            bulkDeleteConfig={{
              confirmTitle: 'Xác nhận xóa phiếu',
              confirmMessage: 'Bạn có chắc muốn xóa {count} phiếu thu/chi đã chọn?'
            }}
          />
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Thêm phiếu thu/chi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ngày giao dịch *</label>
            <input
              type="date"
              value={formData.transactionDate}
              onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại *</label>
            <Segmented
              options={[
                { label: (<span><ArrowDownOutlined className="text-green-600" /> Thu</span>), value: 'THU' },
                { label: (<span><ArrowUpOutlined className="text-red-600" /> Chi</span>), value: 'CHI' },
              ]}
              value={formData.transactionType}
              onChange={(value) => setFormData({ ...formData, transactionType: value as 'THU' | 'CHI', financialCategoryId: '' })}
              block
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sổ quỹ *</label>
            <select
              value={formData.financialCategoryId}
              onChange={(e) => setFormData({ ...formData, financialCategoryId: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- Chọn sổ quỹ --</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số tiền *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tài khoản *</label>
            <select
              value={formData.bankAccountId}
              onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- Chọn tài khoản --</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber} (Số dư: {acc.balance.toLocaleString('vi-VN')} đ)
                </option>
              ))}
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
              Tạo mới
            </button>
          </div>
        </form>
      </Modal>

      {/* Side Panel */}
      {selectedCashbook && (
        <CashbookSidePanel
          cashbook={selectedCashbook}
          onClose={() => setSelectedCashbook(null)}
        />
      )}
    </>
  );
}
