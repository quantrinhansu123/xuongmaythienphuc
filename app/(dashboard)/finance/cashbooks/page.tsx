'use client';

import CashbookSidePanel from '@/components/CashbookSidePanel';
import Modal from '@/components/Modal';
import WrapperContent from '@/components/WrapperContent';
import { useFileExport } from '@/hooks/useFileExport';
import { usePermissions } from '@/hooks/usePermissions';
import { CalendarOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { DatePicker, Select } from 'antd';
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
    { title: 'Danh mục', dataIndex: 'categoryName', key: 'categoryName' },
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
        title="Sổ quỹ"
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
              <Select
                style={{ width: 90 }}
                placeholder="Loại"
                allowClear
                size="middle"
                value={filterQueries['transactionType']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, transactionType: value });
                  } else {
                    const { transactionType, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Thu', value: 'THU' },
                  { label: 'Chi', value: 'CHI' },
                ]}
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
            placeholder: 'Tìm theo mã GD, danh mục, mô tả...',
            filterKeys: ['transactionCode', 'categoryName', 'description'],
            suggestions: {
              apiEndpoint: '/api/finance/cashbooks',
              labelKey: 'transactionCode',
              descriptionKey: 'categoryName',
            },
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã GD</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tài khoản</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCashbooks.map((cb) => (
                  <tr
                    key={cb.id}
                    onClick={() => setSelectedCashbook(cb)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{cb.transactionCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(cb.transactionDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{cb.categoryName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${cb.transactionType === 'THU' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {cb.transactionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {parseFloat(cb.amount.toString()).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {cb.paymentMethod === 'CASH' ? (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">Tiền mặt</span>
                      ) : cb.bankAccountNumber ? (
                        <div>
                          <div className="font-medium text-blue-600">{cb.bankName}</div>
                          <div className="text-xs text-gray-500">...{cb.bankAccountNumber.slice(-4)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{cb.branchName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{cb.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <select
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as 'THU' | 'CHI', financialCategoryId: '' })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="THU">Thu</option>
              <option value="CHI">Chi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Danh mục *</label>
            <select
              value={formData.financialCategoryId}
              onChange={(e) => setFormData({ ...formData, financialCategoryId: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- Chọn danh mục --</option>
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
