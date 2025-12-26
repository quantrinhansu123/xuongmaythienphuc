"use client";

import type { Branch } from "@/services/commonService";
import { Col, Form, Input, Modal, Row, Switch } from "antd";
import { useEffect } from "react";

export type BranchFormValues = {
  branchCode?: string;
  branchName: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  branch: Branch | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: BranchFormValues) => void;
};

export default function BranchFormModal({
  open,
  mode,
  branch,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && branch) {
        form.setFieldsValue({
          branchCode: branch.branchCode,
          branchName: branch.branchName,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          isActive: branch.isActive,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, mode, branch, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit(values as BranchFormValues);
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Thêm chi nhánh" : "Sửa chi nhánh"}
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      width={700}
      okText={mode === "create" ? "Tạo" : "Cập nhật"}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Row gutter={16}>
          {mode === "edit" && (
            <Col span={12}>
              <Form.Item label="Mã chi nhánh">
                <Input value={branch?.branchCode} disabled />
              </Form.Item>
            </Col>
          )}
          <Col span={mode === "edit" ? 12 : 24}>
            <Form.Item
              name="branchName"
              label="Tên chi nhánh"
              rules={[{ required: true }]}
            >
              <Input placeholder="Nhập tên chi nhánh" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Địa chỉ">
          <Input.TextArea rows={2} placeholder="Địa chỉ" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="Điện thoại">
              <Input placeholder="Số điện thoại" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input type="email" placeholder="Email" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="isActive"
          label="Trạng thái"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
