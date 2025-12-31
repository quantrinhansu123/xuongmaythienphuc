'use client';

import BankAccountSidePanel from '@/components/BankAccountSidePanel';
import CommonTable from '@/components/CommonTable';
import WrapperContent from '@/components/WrapperContent';
import useColumn from '@/hooks/useColumn';
import { useFileExport } from '@/hooks/useFileExport';
import useFilter from '@/hooks/useFilter';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { App, Form, Input, InputNumber, Modal, Select, Tag } from 'antd';
import { useEffect, useState } from 'react';

interface BankAccount {
  id: number;
  accountNumber: string;
  accountName?: string;
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

interface VietBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
}

export default function BankAccountsPage() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vietnamBanks, setVietnamBanks] = useState<VietBank[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  const accountType = Form.useWatch('accountType', form);

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
    fetchVietnamBanks();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAccounts();
    }
  }, [JSON.stringify(query), currentUser]);

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

  const fetchVietnamBanks = async () => {
    try {
      const res = await fetch('https://api.vietqr.io/v2/banks');
      const data = await res.json();
      if (data.code === '00' && data.data) {
        setVietnamBanks(data.data);
      }
    } catch (error) {
      console.error('Error fetching Vietnam banks:', error);
    }
  };

  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const branchId = query.branchId || 'all';
      const branchParam = branchId !== 'all' ? `?branchId=${branchId}` : '';
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

  const handleSubmit = async (values: {
    accountType: 'BANK' | 'CASH';
    accountNumber: string;
    accountName?: string;
    accountHolder: string;
    bankName?: string;
    branchName?: string;
    balance?: number;
    branchId?: number;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          balance: values.balance || 0,
          bankName: values.accountType === 'CASH' ? 'Tiền mặt' : values.bankName,
        }),
      });

      const data = await res.json();

      if (data.success) {
        message.success('Tạo tài khoản thành công!');
        setShowModal(false);
        form.resetFields();
        fetchAccounts();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      message.error('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    form.resetFields();
  };



  const exportColumns = [
    { title: 'Số tài khoản', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: 'Tên tài khoản', dataIndex: 'accountName', key: 'accountName' },
    { title: 'Chủ tài khoản', dataIndex: 'accountHolder', key: 'accountHolder' },
    { title: 'Ngân hàng', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Số dư', dataIndex: 'balance', key: 'balance' },
    { title: 'Loại TK', dataIndex: 'accountType', key: 'accountType' },
    { title: 'Chi nhánh', dataIndex: 'companyBranchName', key: 'companyBranchName' },
    { title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive' },
  ];
  const { exportToXlsx } = useFileExport(exportColumns);

  const handleExportExcel = () => {
    const dataToExport = filteredAccounts.map(acc => ({
      ...acc,
      accountType: acc.accountType === 'CASH' ? 'Tiền mặt' : 'Ngân hàng',
      isActive: acc.isActive ? 'Hoạt động' : 'Ngừng',
      bankName: acc.accountType === 'CASH' ? '-' : acc.bankName
    }));
    exportToXlsx(dataToExport, 'tai-khoan');
  };

  const filteredAccounts = applyFilter(accounts);

  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

  const handleBulkDelete = async (ids: React.Key[]) => {
    try {
      for (const id of ids) {
        const res = await fetch(`/api/finance/bank-accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      message.success(`Đã xóa ${ids.length} tài khoản`);
      fetchAccounts();
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const columns: TableColumnsType<BankAccount> = [
    {
      title: 'Loại',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'CASH' ? 'green' : 'blue'}>
          {type === 'CASH' ? '💵 Tiền mặt' : '🏦 Ngân hàng'}
        </Tag>
      ),
    },
    {
      title: 'Số TK / Tên quỹ',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      width: 180,
    },
    {
      title: 'Tên TK',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 150,
      render: (name: string, record: BankAccount) =>
        name || record.accountHolder || '-',
    },
    {
      title: 'Chủ TK',
      dataIndex: 'accountHolder',
      key: 'accountHolder',
      width: 150,
    },
    {
      title: 'Ngân hàng',
      dataIndex: 'bankName',
      key: 'bankName',
      width: 150,
      render: (name: string, record: BankAccount) =>
        record.accountType === 'CASH' ? '-' : name,
    },
    {
      title: 'Số dư',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right' as const,
      render: (balance: number) => formatCurrency(balance),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'companyBranchName',
      key: 'companyBranchName',
      width: 150,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columns });

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
                  value={query.branchId ? Number(query.branchId) : undefined}
                  onChange={(value) => updateQueries([{ key: 'branchId', value }])}
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
                value={query.isActive}
                onChange={(value) => updateQueries([{ key: 'isActive', value }])}
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
                value={query.accountType}
                onChange={(value) => updateQueries([{ key: 'accountType', value }])}
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
            : undefined,
          searchInput: {
            placeholder: 'Tìm theo số TK, chủ TK, ngân hàng...',
            filterKeys: ['accountNumber', 'accountHolder', 'bankName'],
            suggestions: {
              apiEndpoint: '/api/finance/bank-accounts',
              labelKey: 'accountNumber',
              descriptionKey: 'bankName',
            },
          },
          filters: {
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
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
          <CommonTable
            columns={getVisibleColumns()}
            dataSource={filteredAccounts as BankAccount[]}
            loading={loading}
            onRowClick={(record: BankAccount) => setSelectedAccount(record)}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: setSelectedIds,
            }}
            onBulkDelete={handleBulkDelete}
            bulkDeleteConfig={{
              confirmTitle: 'Xác nhận xóa tài khoản',
              confirmMessage: 'Bạn có chắc muốn xóa {count} tài khoản đã chọn?'
            }}
            pagination={{
              ...pagination,
              onChange: handlePageChange,
            }}
          />
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Thêm tài khoản"
        okText="Tạo mới"
        cancelText="Hủy"
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ accountType: 'BANK', balance: 0 }}
        >
          <Form.Item
            name="accountType"
            label="Loại tài khoản"
            rules={[{ required: true, message: 'Vui lòng chọn loại tài khoản' }]}
          >
            <Select
              options={[
                { label: '🏦 Tài khoản ngân hàng', value: 'BANK' },
                { label: '💵 Quỹ tiền mặt', value: 'CASH' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="accountNumber"
            label={accountType === 'CASH' ? 'Tên quỹ' : 'Số tài khoản'}
            rules={[{ required: true, message: accountType === 'CASH' ? 'Vui lòng nhập tên quỹ' : 'Vui lòng nhập số tài khoản' }]}
          >
            <Input placeholder={accountType === 'CASH' ? 'VD: Quỹ tiền mặt chính' : 'VD: 0123456789'} />
          </Form.Item>

          <Form.Item
            name="accountName"
            label="Tên tài khoản"
            tooltip="Tên hiển thị khi chọn tài khoản"
          >
            <Input placeholder="VD: TK Lương, TK Thu chi..." />
          </Form.Item>

          <Form.Item
            name="accountHolder"
            label={accountType === 'CASH' ? 'Người quản lý' : 'Chủ tài khoản'}
            rules={[{ required: true, message: 'Vui lòng nhập thông tin' }]}
          >
            <Input />
          </Form.Item>

          {isAdmin && (
            <Form.Item
              name="branchId"
              label="Chi nhánh công ty"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select
                placeholder="-- Chọn chi nhánh --"
                options={branches.map((b) => ({
                  label: b.branchName,
                  value: b.id,
                }))}
              />
            </Form.Item>
          )}

          {accountType === 'BANK' && (
            <>
              <Form.Item
                name="bankName"
                label="Ngân hàng"
                rules={[{ required: true, message: 'Vui lòng chọn ngân hàng' }]}
              >
                <Select
                  showSearch
                  placeholder="Chọn ngân hàng"
                  optionFilterProp="searchLabel"
                  options={vietnamBanks.map((bank) => ({
                    value: bank.shortName,
                    label: (
                      <div className="flex items-center gap-2">
                        <img src={bank.logo} alt={bank.shortName} className="w-6 h-6 object-contain" />
                        <span>{bank.shortName} - {bank.name}</span>
                      </div>
                    ),
                    searchLabel: `${bank.shortName} ${bank.name} ${bank.code}`,
                  }))}
                  filterOption={(input, option) =>
                    (option?.searchLabel as string || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item name="branchName" label="Chi nhánh ngân hàng">
                <Input placeholder="VD: Chi nhánh Hà Nội" />
              </Form.Item>
            </>
          )}

          <Form.Item name="balance" label="Số dư ban đầu">
            <InputNumber<number>
              className="w-full"
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => (value?.replace(/\$\s?|(,*)/g, '') || '0') as unknown as number}
              placeholder="0"
            />
          </Form.Item>
        </Form>
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
