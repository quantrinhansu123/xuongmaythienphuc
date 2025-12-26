"use client";

import { Modal, Form, Input, InputNumber } from "antd";
import { useEffect } from "react";
import type { CustomerGroup } from "@/services/customerGroupService";

export interface CustomerGroupFormValues {
  groupCode: string;
  groupName: string;
  priceMultiplier: number;
  description?: string;
}

interface CustomerGroupFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  group: CustomerGroup | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: CustomerGroupFormValues) => void;
}

export default function CustomerGroupFormModal({
  open,
  mode,
  group,
  confirmLoading,
  onCancel,
  onSubmit,
}: CustomerGroupFormModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && group) {
        form.setFieldsValue({
          groupCode: group.groupCode,
          groupName: group.groupName,
          priceMultiplier: group.priceMultiplier,
          description: group.description,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ priceMultiplier: 0 });
      }
    }
  }, [open, mode, group, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Thêm nhóm khách hàng mới" : "Chỉnh sửa nhóm khách hàng"}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText={mode === "create" ? "Tạo mới" : "Cập nhật"}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="groupCode"
          label="Mã nhóm"
          rules={[{ required: true, message: "Vui lòng nhập mã nhóm" }]}
        >
          <Input placeholder="VD: VIP, RETAIL, WHOLESALE" disabled={mode === "edit"} />
        </Form.Item>

        <Form.Item
          name="groupName"
          label="Tên nhóm"
          rules={[{ required: true, message: "Vui lòng nhập tên nhóm" }]}
        >
          <Input placeholder="Nhập tên nhóm khách hàng" />
        </Form.Item>

        <Form.Item
          name="priceMultiplier"
          label="Hệ số giá (%)"
          rules={[
            { required: true, message: "Vui lòng nhập hệ số giá" },
            { type: "number", min: 0, max: 100, message: "Hệ số giá từ 0-100%" },
          ]}
          tooltip="VD: 10 = giảm 10%, 20 = giảm 20%, 0 = không giảm"
        >
          <InputNumber
            style={{ width: "100%" }}
            placeholder="0"
            min={0}
            max={100}
            step={0.1}
            addonAfter="%"
          />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Nhập mô tả về nhóm khách hàng" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
