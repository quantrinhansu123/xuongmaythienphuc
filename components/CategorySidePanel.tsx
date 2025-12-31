'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { CloseOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Form, Input, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

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

interface Props {
  category: FinancialCategory;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CategorySidePanel({ category, onClose, onUpdate }: Props) {
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [category.id]);

  useEffect(() => {
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      type: category.type,
      description: category.description,
      bankAccountId: category.bankAccountId,
    });
  }, [category, form]);

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

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/finance/cashbooks?categoryId=${category.id}`);
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

  const handleSubmit = async (values: any) => {
    try {
      const res = await fetch(`/api/finance/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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

  const totalThu = transactions.filter(t => t.transactionType === 'THU').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalChi = transactions.filter(t => t.transactionType === 'CHI').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalThu - totalChi;

  const transactionColumns = [
    {
      title: 'Ngày',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Mã GD',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      width: 110,
      render: (code: string) => <Typography.Text code className="text-xs">{code}</Typography.Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number, record: any) => (
        <Typography.Text strong style={{ color: record.transactionType === 'THU' ? '#52c41a' : '#ff4d4f' }}>
          {record.transactionType === 'THU' ? '+' : '-'}{formatCurrency(amount)}
        </Typography.Text>
      ),
    },
  ];

  const getTypeTag = (type: string) => {
    if (type === 'THU') return <Tag color="green">Thu</Tag>;
    if (type === 'CHI') return <Tag color="red">Chi</Tag>;
    return <Tag color="blue">Thu & Chi</Tag>;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[550px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Typography.Title level={5} style={{ margin: 0 }}>
            Chi tiết sổ quỹ
          </Typography.Title>
          {getTypeTag(category.type)}
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!isEditing ? (
          <>
            {/* Thông tin sổ quỹ */}
            <Card title="Thông tin sổ quỹ" size="small">
              <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
                <Descriptions.Item label="Mã sổ quỹ">
                  <Typography.Text code>{category.categoryCode}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tên sổ quỹ">
                  <Typography.Text strong>{category.categoryName}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Loại">
                  {getTypeTag(category.type)}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">{category.description || '-'}</Descriptions.Item>
                {category.bankName && (
                  <Descriptions.Item label="TK liên kết">
                    <Typography.Text type="secondary">
                      {category.bankName} - {category.bankAccountNumber}
                    </Typography.Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Trạng thái">
                  <Tag color={category.isActive ? 'green' : 'default'}>
                    {category.isActive ? 'Hoạt động' : 'Ngừng'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {new Date(category.createdAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Thống kê */}
            <Card size="small">
              <div className="grid grid-cols-3 gap-4">
                <Statistic
                  title="Tổng thu"
                  value={totalThu}
                  precision={0}
                  valueStyle={{ color: '#52c41a', fontSize: 16 }}
                  suffix="đ"
                  formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                />
                <Statistic
                  title="Tổng chi"
                  value={totalChi}
                  precision={0}
                  valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                  suffix="đ"
                  formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                />
                <Statistic
                  title="Số dư"
                  value={balance}
                  precision={0}
                  valueStyle={{ color: '#1890ff', fontSize: 16 }}
                  suffix="đ"
                  formatter={(value) => `${Number(value).toLocaleString('vi-VN')}`}
                />
              </div>
            </Card>

            {/* Lịch sử giao dịch */}
            <Card title="Lịch sử giao dịch" size="small">
              <Table
                dataSource={transactions.map((t, idx) => ({ ...t, key: idx }))}
                columns={transactionColumns}
                loading={loadingTransactions}
                pagination={{ pageSize: 5, size: 'small' }}
                size="small"
                locale={{ emptyText: 'Chưa có giao dịch' }}
              />
            </Card>

            {/* Actions */}
            <Card size="small">
              <Space>
                {can('finance.categories', 'edit') && (
                  <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                    Sửa
                  </Button>
                )}
                {can('finance.categories', 'delete') && (
                  <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                    Xóa
                  </Button>
                )}
              </Space>
            </Card>
          </>
        ) : (
          /* Edit Form */
          <Card title="Chỉnh sửa sổ quỹ" size="small">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="categoryCode" label="Mã sổ quỹ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="categoryName" label="Tên sổ quỹ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Thu', value: 'THU' },
                    { label: 'Chi', value: 'CHI' },
                    { label: 'Thu & Chi', value: 'BOTH' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="bankAccountId" label="Tài khoản mặc định">
                <Select
                  allowClear
                  placeholder="-- Không chọn --"
                  options={bankAccounts.map((acc: any) => ({
                    label: `${acc.bankName} - ${acc.accountNumber}`,
                    value: acc.id,
                  }))}
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Lưu
                </Button>
                <Button onClick={() => setIsEditing(false)}>Hủy</Button>
              </Space>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
