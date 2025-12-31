'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import {
    ArrowDownOutlined,
    ArrowLeftOutlined,
    ArrowUpOutlined,
    BankOutlined,
    CalendarOutlined,
    DeleteOutlined,
    EditOutlined,
    SaveOutlined,
    UserOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI' | 'BOTH';
  description: string;
  isActive: boolean;
  createdAt: string;
  bankAccountId?: number;
  bankName?: string;
  bankAccountNumber?: string;
}

interface Transaction {
  id: number;
  transactionCode: string;
  transactionDate: string;
  amount: number;
  transactionType: 'THU' | 'CHI';
  paymentMethod: string;
  description: string;
  bankName?: string;
  bankAccountNumber?: string;
  createdByName: string;
  branchName: string;
  createdAt: string;
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params?.id ? Number(params.id) : null;
  const { can } = usePermissions();
  const isMobile = useIsMobile();

  const [category, setCategory] = useState<FinancialCategory | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);

  useEffect(() => {
    if (categoryId) {
      fetchCategory();
      fetchBankAccounts();
    }
  }, [categoryId]);

  useEffect(() => {
    if (categoryId) {
      fetchTransactions();
    }
  }, [categoryId, dateRange]);

  const fetchCategory = async () => {
    try {
      const res = await fetch(`/api/finance/categories/${categoryId}`);
      const data = await res.json();
      if (data.success) {
        setCategory(data.data);
        form.setFieldsValue({
          categoryCode: data.data.categoryCode,
          categoryName: data.data.categoryName,
          type: data.data.type,
          description: data.data.description,
          bankAccountId: data.data.bankAccountId,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      const res = await fetch(
        `/api/finance/cashbooks?categoryId=${categoryId}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTransactions(false);
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
      console.error(error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const res = await fetch(`/api/finance/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công!');
        setIsEditing(false);
        fetchCategory();
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
      const res = await fetch(`/api/finance/categories/${categoryId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công!');
        router.push('/finance/categories');
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const getTypeTag = (type: string) => {
    if (type === 'THU') return <Tag color="green">Thu</Tag>;
    if (type === 'CHI') return <Tag color="red">Chi</Tag>;
    return <Tag color="blue">Thu & Chi</Tag>;
  };

  const totalThu = transactions
    .filter((t) => t.transactionType === 'THU')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalChi = transactions
    .filter((t) => t.transactionType === 'CHI')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalThu - totalChi;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-4">
        <Alert title="Không tìm thấy sổ quỹ" type="error" showIcon />
        <Button onClick={() => router.back()} className="mt-4">
          Quay lại
        </Button>
      </div>
    );
  }

  // Mobile Transaction Card
  const MobileTransactionCard = ({ item }: { item: Transaction }) => (
    <div className="bg-white rounded-lg border p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Typography.Text code className="text-xs">
              {item.transactionCode}
            </Typography.Text>
            <Tag color={item.transactionType === 'THU' ? 'green' : 'red'} className="text-xs m-0">
              {item.transactionType === 'THU' ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {item.transactionType}
            </Tag>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <CalendarOutlined className="mr-1" />
            {new Date(item.transactionDate).toLocaleDateString('vi-VN')}
          </div>
        </div>
        <Typography.Text
          strong
          className="text-base whitespace-nowrap"
          style={{ color: item.transactionType === 'THU' ? '#52c41a' : '#ff4d4f' }}
        >
          {item.transactionType === 'THU' ? '+' : '-'}
          {formatCurrency(item.amount, '')}
        </Typography.Text>
      </div>
      
      {item.bankName && (
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 truncate">
          <BankOutlined />
          <span className="truncate">{item.bankName}</span>
          <span className="text-gray-400">...{item.bankAccountNumber?.slice(-4)}</span>
        </div>
      )}
      
      {item.description && (
        <div className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</div>
      )}
      
      <div className="flex justify-between text-xs text-gray-400 mt-2 pt-2 border-t">
        <span className="truncate flex-1"><UserOutlined className="mr-1" />{item.createdByName}</span>
        <span className="truncate">{item.branchName}</span>
      </div>
    </div>
  );

  // Desktop columns
  const columns = [
    {
      title: 'Mã GD',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      width: 120,
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    {
      title: 'Ngày',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Loại',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 80,
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
      width: 130,
      align: 'right' as const,
      render: (amount: number, record: Transaction) => (
        <Typography.Text
          strong
          style={{ color: record.transactionType === 'THU' ? '#52c41a' : '#ff4d4f' }}
        >
          {record.transactionType === 'THU' ? '+' : '-'}
          {formatCurrency(amount)}
        </Typography.Text>
      ),
    },
    {
      title: 'Tài khoản',
      key: 'bankAccount',
      width: 140,
      render: (_: any, record: Transaction) =>
        record.bankName ? (
          <div className="truncate">
            <div className="text-blue-600 text-sm truncate">{record.bankName}</div>
            <div className="text-xs text-gray-400">...{record.bankAccountNumber?.slice(-4)}</div>
          </div>
        ) : (
          <Tag>Tiền mặt</Tag>
        ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 100,
      ellipsis: true,
    },
    {
      title: 'Người tạo',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: 100,
      ellipsis: true,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/finance/categories')}
            size={isMobile ? 'small' : 'middle'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Typography.Title level={5} style={{ margin: 0 }} className="truncate">
                {category.categoryName}
              </Typography.Title>
              {getTypeTag(category.type)}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Typography.Text code className="text-xs">{category.categoryCode}</Typography.Text>
              <Tag color={category.isActive ? 'green' : 'default'} className="text-xs">
                {category.isActive ? 'Hoạt động' : 'Ngừng'}
              </Tag>
            </div>
          </div>
        </div>
        {!isEditing && (
          <Space size="small">
            {can('finance.categories', 'edit') && (
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)} size="small" />
            )}
            {can('finance.categories', 'delete') && (
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete} size="small" />
            )}
          </Space>
        )}
      </div>

      {/* Edit Form or Info */}
      {isEditing ? (
        <Card size="small">
          <Form form={form} layout="vertical" onFinish={handleSubmit} size="small">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              <Form.Item name="categoryCode" label="Mã sổ quỹ" rules={[{ required: true }]} className="mb-2">
                <Input />
              </Form.Item>
              <Form.Item name="categoryName" label="Tên sổ quỹ" rules={[{ required: true }]} className="mb-2">
                <Input />
              </Form.Item>
              <Form.Item name="type" label="Loại" rules={[{ required: true }]} className="mb-2">
                <Select
                  options={[
                    { label: 'Thu', value: 'THU' },
                    { label: 'Chi', value: 'CHI' },
                    { label: 'Thu & Chi', value: 'BOTH' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="bankAccountId" label="TK mặc định" className="mb-2">
                <Select
                  allowClear
                  placeholder="Không chọn"
                  options={bankAccounts.map((acc: any) => ({
                    label: `${acc.bankName} - ...${acc.accountNumber.slice(-4)}`,
                    value: acc.id,
                  }))}
                />
              </Form.Item>
            </div>
            <Form.Item name="description" label="Mô tả" className="mb-3">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="small">
                Lưu
              </Button>
              <Button onClick={() => setIsEditing(false)} size="small">Hủy</Button>
            </Space>
          </Form>
        </Card>
      ) : (
        category.description || category.bankName ? (
          <Card size="small" className="bg-gray-50">
            <div className="space-y-1 text-sm">
              {category.description && (
                <div><span className="text-gray-500">Mô tả:</span> {category.description}</div>
              )}
              {category.bankName && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">TK liên kết:</span>
                  <BankOutlined className="text-blue-500" />
                  <span className="truncate">{category.bankName} - ...{category.bankAccountNumber?.slice(-4)}</span>
                </div>
              )}
            </div>
          </Card>
        ) : null
      )}

      {/* Statistics */}
      <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-3'} gap-2`}>
        <Card size="small" className="bg-green-50 border-green-200 overflow-hidden">
          <div className="text-xs text-gray-500 mb-1">Tổng thu</div>
          <div className="text-green-600 font-bold truncate" style={{ fontSize: isMobile ? 13 : 18 }}>
            <ArrowDownOutlined className="mr-1" />
            {totalThu.toLocaleString('vi-VN')}
          </div>
        </Card>
        <Card size="small" className="bg-red-50 border-red-200 overflow-hidden">
          <div className="text-xs text-gray-500 mb-1">Tổng chi</div>
          <div className="text-red-600 font-bold truncate" style={{ fontSize: isMobile ? 13 : 18 }}>
            <ArrowUpOutlined className="mr-1" />
            {totalChi.toLocaleString('vi-VN')}
          </div>
        </Card>
        <Card size="small" className="bg-blue-50 border-blue-200 overflow-hidden">
          <div className="text-xs text-gray-500 mb-1">Số dư</div>
          <div className="font-bold truncate" style={{ fontSize: isMobile ? 13 : 18, color: balance >= 0 ? '#1890ff' : '#ff4d4f' }}>
            {balance.toLocaleString('vi-VN')}
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card
        title={<span className="text-sm">Lịch sử giao dịch</span>}
        size="small"
        extra={
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            format="DD/MM"
            size="small"
            style={{ width: isMobile ? 160 : 220 }}
            suffixIcon={<CalendarOutlined />}
            presets={[
              { label: 'Hôm nay', value: [dayjs(), dayjs()] },
              { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs()] },
              { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]}
          />
        }
        styles={{ body: { padding: isMobile ? 8 : 16 } }}
      >
        {isMobile ? (
          <div className="space-y-2">
            {loadingTransactions ? (
              <div className="text-center py-8"><Spin /></div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Chưa có giao dịch</div>
            ) : (
              transactions.map((item) => <MobileTransactionCard key={item.id} item={item} />)
            )}
          </div>
        ) : (
          <Table
            dataSource={transactions.map((t) => ({ ...t, key: t.id }))}
            columns={columns}
            loading={loadingTransactions}
            pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `${total} giao dịch` }}
            size="small"
            locale={{ emptyText: 'Chưa có giao dịch' }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
}
