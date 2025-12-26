"use client";

import type { Customer } from "@/services/customerService";
import { formatCurrency } from "@/utils/format";
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { Button, Descriptions, Drawer, Space, Tag } from "antd";

interface CustomerDetailDrawerProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function CustomerDetailDrawer({
  open,
  customer,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: CustomerDetailDrawerProps) {
  if (!customer) return null;

  return (
    <Drawer
      title="Chi tiết khách hàng"
      placement="right"
      onClose={onClose}
      open={open}
      size={600}
      extra={
        <Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(customer)}
            >
              Sửa
            </Button>
          )}
          {canDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(customer.id)}
            >
              Xóa
            </Button>
          )}
        </Space>
      }
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="Mã khách hàng">
          <span className="font-mono">{customer.customerCode}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Tên khách hàng">
          <span className="font-medium">{customer.customerName}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Điện thoại">
          {customer.phone || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {customer.email || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ">
          {customer.address || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Nhóm khách hàng">
          {customer.groupName || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Công nợ">
          <span
            className={
              customer.debtAmount > 0 ? "text-red-600 font-semibold" : ""
            }
          >
            {formatCurrency(customer.debtAmount)}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag
            color={customer.isActive ? "success" : "error"}
            icon={customer.isActive ? <UnlockOutlined /> : <LockOutlined />}
          >
            {customer.isActive ? "Hoạt động" : "Ngừng"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">
          {new Date(customer.createdAt).toLocaleString("vi-VN")}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}
