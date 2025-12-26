"use client";

import type { Branch, Role } from "@/services/commonService";
import type { User } from "@/services/userService";
import { Col, Form, Input, Modal, Row, Select, Switch } from "antd";
import { useEffect } from "react";

// Form values used by the modal. For create: `userCode`, `username`, `password` are required;
// for edit they are optional. We model a flexible type that covers both cases.
export type UserFormValues = {
  userCode?: string;
  username?: string;
  password?: string;
  fullName: string;
  email?: string;
  phone?: string;
  branchId: number;
  roleId: number;
  isActive?: boolean;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  user: User | null;
  roles?: Role[];
  branches?: Branch[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => void;
};

export default function UserFormModal({
  open,
  mode,
  user,
  roles = [],
  branches = [],
  confirmLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && user) {
        form.setFieldsValue({
          userCode: user.userCode,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          roleId: user.roleId,
          branchId: user.branchId,
          isActive: user.isActive,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, mode, user, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      // Cast to our typed form values
      onSubmit(values as UserFormValues);
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Thêm người dùng" : "Sửa người dùng"}
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      width={700}
      okText={mode === "create" ? "Thêm" : "Cập nhật"}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {mode === "edit" && (
            <Col span={12}>
              <Form.Item label="Mã nhân viên">
                <Input value={user?.userCode} disabled />
              </Form.Item>
            </Col>
          )}
          <Col span={mode === "edit" ? 12 : 24}>
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
              ]}
            >
              <Input
                placeholder="Nhập tên đăng nhập"
                disabled={mode === "edit"}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label="Họ tên"
              rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
            >
              <Input placeholder="Nhập họ tên" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input type="email" placeholder="Nhập email" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="Nhập số điện thoại" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="branchId"
              label="Chi nhánh"
              rules={[{ required: true, message: "Vui lòng chọn chi nhánh" }]}
            >
              <Select
                placeholder="Chọn chi nhánh"
                options={branches.map((b) => ({
                  label: b.branchName,
                  value: b.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="roleId"
              label="Vai trò"
              rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
            >
              <Select
                placeholder="Chọn vai trò"
                options={roles.map((r) => ({ label: r.roleName, value: r.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {mode === "create" && (
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            )}
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
