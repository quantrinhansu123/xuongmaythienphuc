'use client';

import { formatCurrency } from '@/utils/format';
import { ArrowDownOutlined, ArrowUpOutlined, CloseOutlined, PrinterOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Space, Tag, Typography } from 'antd';

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
  createdAt: string;
}

interface Props {
  cashbook: CashBook;
  onClose: () => void;
}

export default function CashbookSidePanel({ cashbook, onClose }: Props) {
  const handlePrint = () => {
    window.open(`/api/finance/cashbooks/${cashbook.id}/pdf`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Typography.Title level={5} style={{ margin: 0 }}>
            {cashbook.transactionType === 'THU' ? 'Phiếu thu' : 'Phiếu chi'}
          </Typography.Title>
          <Tag color={cashbook.transactionType === 'THU' ? 'green' : 'red'}>
            {cashbook.transactionType === 'THU' ? <ArrowDownOutlined /> : <ArrowUpOutlined />} {cashbook.transactionType}
          </Tag>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Thông tin giao dịch */}
        <Card title="Thông tin giao dịch" size="small">
          <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
            <Descriptions.Item label="Mã giao dịch">
              <Typography.Text code>{cashbook.transactionCode}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày giao dịch">
              {new Date(cashbook.transactionDate).toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Sổ quỹ">
              <Typography.Text strong>{cashbook.categoryName}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức">
              <Tag>
                {cashbook.paymentMethod === 'CASH' ? 'Tiền mặt' :
                  cashbook.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Chuyển khoản'}
              </Tag>
            </Descriptions.Item>
            {cashbook.bankAccountNumber && (
              <Descriptions.Item label="Tài khoản">
                <Typography.Text type="secondary">
                  {cashbook.bankName} - {cashbook.bankAccountNumber}
                </Typography.Text>
              </Descriptions.Item>
            )}
            {cashbook.description && (
              <Descriptions.Item label="Mô tả">{cashbook.description}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Số tiền */}
        <Card size="small" className="bg-blue-50/50">
          <div className="text-center">
            <Typography.Text type="secondary">Số tiền</Typography.Text>
            <Typography.Title
              level={3}
              style={{ margin: '8px 0 0', color: cashbook.transactionType === 'THU' ? '#52c41a' : '#ff4d4f' }}
            >
              {cashbook.transactionType === 'THU' ? '+' : '-'}{formatCurrency(cashbook.amount)}
            </Typography.Title>
          </div>
        </Card>

        {/* Thông tin khác */}
        <Card title="Thông tin khác" size="small">
          <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
            <Descriptions.Item label="Chi nhánh">{cashbook.branchName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Người tạo">{cashbook.createdByName}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {new Date(cashbook.createdAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Actions */}
        <Card size="small">
          <Space className="w-full" direction="vertical">
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              block
            >
              In phiếu
            </Button>
          </Space>
        </Card>

        {/* Info */}
        <Card size="small" className="bg-blue-50 border-blue-200">
          <Typography.Text type="secondary" className="text-sm">
            💡 Phiếu thu/chi không thể chỉnh sửa hoặc xóa sau khi tạo. Click "In phiếu" để in hoặc lưu PDF.
          </Typography.Text>
        </Card>
      </div>
    </div>
  );
}
