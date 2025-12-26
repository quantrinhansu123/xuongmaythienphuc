'use client';

import BankAccountSidePanel from '@/components/BankAccountSidePanel';
import Modal from '@/components/Modal';
import WrapperContent from '@/components/WrapperContent';
import { useFileExport } from '@/hooks/useFileExport';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useState } from 'react';

interface BankAccount {
  id: number;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  branchName?: string;
  balance: number;
  isActive: boolean;
  companyBranchName: string;
  branchId: number;
  createdAt: string;
  accountType?: 'BANK' | 'CASH';
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

export default function BankAccountsPage() {
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    accountNumber: '',
    accountHolder: '',
    bankName: '',
    branchName: '',
    balance: '',
    accountType: 'BANK' as 'BANK' | 'CASH',
    branchId: '' as string,
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAccounts();
    }
  }, [selectedBranchId, currentUser]);

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

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchId !== 'all' ? `?branchId=${selectedBranchId}` : '';
      const res = await fetch(`/api/finance/bank-accounts${branchParam}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance || '0'),
          bankName: formData.accountType === 'CASH' ? 'Tiền mặt' : formData.bankName,
          branchId: formData.branchId ? parseInt(formData.branchId) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo tài khoản thành công!');
        setShowModal(false);
        resetForm();
        fetchAccounts();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const resetForm = () => {
    setFormData({
      accountNumber: '',
      accountHolder: '',
      bankName: '',
      branchName: '',
      balance: '',
      accountType: 'BANK',
      branchId: '',
    });
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
  };

  const exportColumns = [
    { title: 'Số tài khoản', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: 'Chủ tài khoản', dataIndex: 'accountHolder', key: 'accountHolder' },
    { title: 'Ngân hàng', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Số dư', dataIndex: 'balance', key: 'balance' },
    { title: 'Loại TK', dataIndex: 'accountType', key: 'accountType' },
    { title: 'Chi nhánh', dataIndex: 'companyBranchName', key: 'companyBranchName' },
    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive' },
  ];
  const { exportToXlsx } = useFileExport(exportColumns);

  const handleExportExcel = () => {
    exportToXlsx(filteredAccounts, 'tai-khoan');
  };

  const filteredAccounts = accounts.filter(acc => {
    const searchKey = 'search,accountNumber,accountHolder,bankName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue ||
      acc.accountNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
      acc.accountHolder.toLowerCase().includes(searchValue.toLowerCase()) ||
      acc.bankName.toLowerCase().includes(searchValue.toLowerCase());

    const statusValue = filterQueries['isActive'];
    const matchStatus = statusValue === undefined || acc.isActive === (statusValue === 'true');

    const typeValue = filterQueries['accountType'];
    const matchType = !typeValue || acc.accountType === typeValue;

    return matchSearch && matchStatus && matchType;
  });

  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

  return (
    <>
      <WrapperContent<BankAccount>
        title="Quản lý tài khoản"
        isNotAccessible={!can('finance.cashbooks', 'view')}
        isLoading={loading}
        header={{
          customToolbar: (
            <div className="flex gap-2 items-center flex-wrap">
              {isAdmin && (
                <Select
                  style={{ width: 160 }}
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
              <Select
                style={{ width: 140 }}
                placeholder="Loại TK"
                allowClear
                size="middle"
                value={filterQueries['accountType']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, accountType: value });
                  } else {
                    const { accountType, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Ngân hàng', value: 'BANK' },
                  { label: 'Tiền mặt', value: 'CASH' },
                ]}
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
            placeholder: 'Tìm theo số TK, chủ TK, ngân hàng...',
            filterKeys: ['accountNumber', 'accountHolder', 'bankName'],
            suggestions: {
              apiEndpoint: '/api/finance/bank-accounts',
              labelKey: 'accountNumber',
              descriptionKey: 'bankName',
            },
          },
        }}
      >
        <div className="space-y-6">

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 mb-1">Tổng số dư</div>
            <div className="text-2xl font-bold text-blue-700">
              {totalBalance.toLocaleString('vi-VN')} đ
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số TK / Tên quỹ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ TK</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngân hàng</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${account.accountType === 'CASH' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {account.accountType === 'CASH' ? '💵 Tiền mặt' : '🏦 Ngân hàng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{account.accountNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{account.accountHolder}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{account.accountType === 'CASH' ? '-' : account.bankName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {parseFloat(account.balance.toString()).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{account.companyBranchName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {account.isActive ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </td>
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
        title="Thêm tài khoản"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Loại tài khoản *</label>
            <select
              value={formData.accountType}
              onChange={(e) => setFormData({
                ...formData,
                accountType: e.target.value as 'BANK' | 'CASH',
                bankName: e.target.value === 'CASH' ? 'Tiền mặt' : formData.bankName
              })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="BANK">🏦 Tài khoản ngân hàng</option>
              <option value="CASH">💵 Quỹ tiền mặt</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {formData.accountType === 'CASH' ? 'Tên quỹ *' : 'Số tài khoản *'}
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              placeholder={formData.accountType === 'CASH' ? 'VD: Quỹ tiền mặt chính' : 'VD: 0123456789'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {formData.accountType === 'CASH' ? 'Người quản lý *' : 'Chủ tài khoản *'}
            </label>
            <input
              type="text"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          {/* Chi nhánh công ty - hiển thị cho Admin */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1">Chi nhánh công ty *</label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>
            </div>
          )}

          {formData.accountType === 'BANK' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Ngân hàng *</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  placeholder="VD: Vietcombank, Techcombank, BIDV..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Chi nhánh ngân hàng</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="VD: Chi nhánh Hà Nội"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Số dư ban đầu</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              min="0"
              step="0.01"
              placeholder="0"
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
      {selectedAccount && (
        <BankAccountSidePanel
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onUpdate={fetchAccounts}
        />
      )}
    </>
  );
}
