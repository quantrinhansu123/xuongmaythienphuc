'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { BankOutlined, DeleteOutlined, DollarOutlined, EditOutlined, HistoryOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Descriptions, Divider, Drawer, Form, Input, InputNumber, message, Popconfirm, Space, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

interface Props {
  account: BankAccount;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BankAccountSidePanel({ account, onClose, onUpdate }: Props) {
  const { can } = usePermissions();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const isCash = account.accountType === 'CASH' || account.bankName === 'Tiền mặt';

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Cập nhật thành công!');
        setIsEditing(false);
        onUpdate();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        message.success('Xóa thành công!');
        onClose();
        onUpdate();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(account.isActive ? 'Đã tạm ngừng tài khoản!' : 'Đã kích hoạt tài khoản!');
        onUpdate();
      } else {
        message.error(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = () => {
    router.push(`/finance/bank-accounts/${account.id}`);
    onClose();
  };

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={true}
      width={480}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isCash ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
            {isCash ? <DollarOutlined style={{ fontSize: 28 }} /> : <BankOutlined style={{ fontSize: 28 }} />}
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900">{account.accountNumber}</div>
            <div className="text-sm text-gray-500">{account.accountHolder}</div>
          </div>
          <Tag color={account.isActive ? 'green' : 'default'}>
            {account.isActive ? 'Hoạt động' : 'Ngừng'}
          </Tag>
        </div>
        <div className="mt-4 p-4 bg-white rounded-lg border">
          <div className="text-sm text-gray-500">Số dư hiện tại</div>
          <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(account.balance)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!isEditing ? (
          <>
            <Descriptions column={1} size="small" labelStyle={{ color: '#666', width: 120 }}>
              {!isCash && (
                <>
                  <Descriptions.Item label="Ngân hàng">{account.bankName}</Descriptions.Item>
                  {account.branchName && (
                    <Descriptions.Item label="Chi nhánh NH">{account.branchName}</Descriptions.Item>
                  )}
                </>
              )}
              <Descriptions.Item label="Chi nhánh công ty">
                {account.companyBranchName || <span className="text-gray-400">Chưa có</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Loại tài khoản">
                <Tag color={isCash ? 'green' : 'blue'}>
                  {isCash ? 'Tiền mặt' : 'Ngân hàng'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(account.createdAt).toLocaleDateString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Button
              type="primary"
              icon={<HistoryOutlined />}
              block
              size="large"
              onClick={handleViewDetail}
            >
              Xem lịch sử giao dịch
            </Button>

            <Divider />

            <Space wrap className="w-full justify-center">
              {can('finance.bank_accounts', 'edit') && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    form.setFieldsValue({
                      accountNumber: account.accountNumber,
                      accountHolder: account.accountHolder,
                      bankName: account.bankName,
                      branchName: account.branchName || '',
                      balance: account.balance,
                    });
                    setIsEditing(true);
                  }}
                >
                  Sửa
                </Button>
              )}
              <Popconfirm
                title={account.isActive ? "Tạm ngừng tài khoản?" : "Kích hoạt tài khoản?"}
                onConfirm={handleToggleStatus}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button
                  icon={account.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  loading={loading}
                >
                  {account.isActive ? 'Tạm ngừng' : 'Kích hoạt'}
                </Button>
              </Popconfirm>
              {can('finance.bank_accounts', 'delete') && (
                <Popconfirm
                  title="Xác nhận xóa tài khoản này?"
                  description="Không thể xóa tài khoản đã có giao dịch"
                  onConfirm={handleDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={loading}>
                    Xóa
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="accountNumber"
              label={isCash ? 'Tên quỹ' : 'Số tài khoản'}
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="accountHolder"
              label={isCash ? 'Người quản lý' : 'Chủ tài khoản'}
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <Input />
            </Form.Item>
            {!isCash && (
              <>
                <Form.Item
                  name="bankName"
                  label="Ngân hàng"
                  rules={[{ required: true, message: 'Bắt buộc' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="branchName" label="Chi nhánh NH">
                  <Input />
                </Form.Item>
              </>
            )}
            <Form.Item
              name="balance"
              label="Số dư"
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <InputNumber
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/,/g, '') as any}
              />
            </Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsEditing(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Lưu
              </Button>
            </Space>
          </Form>
        )}
      </div>
    </Drawer>
  );
}
