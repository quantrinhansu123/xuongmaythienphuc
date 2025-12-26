"use client";

import type { CustomerGroup } from "@/services/customerGroupService";
import type { Customer } from "@/services/customerService";
import { Form, Input, Modal, Select, Switch } from "antd";
import { useEffect } from "react";

export interface CustomerFormValues {
  customerCode?: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  isActive?: boolean;
}

interface CustomerFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  customer: Customer | null;
  groups: CustomerGroup[];
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => void;
}

export default function CustomerFormModal({
  open,
  mode,
  customer,
  groups,
  confirmLoading,
  onCancel,
  onSubmit,
}: CustomerFormModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && customer) {
        form.setFieldsValue({
          customerCode: customer.customerCode,
          customerName: customer.customerName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          customerGroupId: customer.customerGroupId,
          isActive: customer.isActive,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ isActive: true });
      }
    }
  }, [open, mode, customer, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Thêm khách hàng mới" : "Chỉnh sửa khách hàng"}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText={mode === "create" ? "Tạo mới" : "Cập nhật"}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical">
        {mode === "edit" && (
          <Form.Item name="customerCode" label="Mã khách hàng">
            <Input disabled />
          </Form.Item>
        )}

        <Form.Item
          name="customerName"
          label="Tên khách hàng"
          rules={[{ required: true, message: "Vui lòng nhập tên khách hàng" }]}
        >
          <Input placeholder="Nhập tên khách hàng" />
        </Form.Item>

        <Form.Item name="phone" label="Điện thoại">
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: "email", message: "Email không hợp lệ" }]}
        >
          <Input placeholder="Nhập email" />
        </Form.Item>

        <Form.Item name="address" label="Địa chỉ">
          <Input.TextArea rows={2} placeholder="Nhập địa chỉ" />
        </Form.Item>

        <Form.Item name="customerGroupId" label="Nhóm khách hàng">
          <Select
            placeholder="Chọn nhóm khách hàng"
            allowClear
            options={groups.map((g) => ({
              label: g.groupName,
              value: g.id,
            }))}
          />
        </Form.Item>

        {mode === "edit" && (
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
