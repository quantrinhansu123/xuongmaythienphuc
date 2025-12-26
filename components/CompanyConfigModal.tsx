"use client";

import { useGetCompany, useUpdateCompany } from "@/hooks/useCompany";
import { Form, Input, Modal, Spin } from "antd";
import { useEffect } from "react";

const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CompanyConfigModal({ open, onClose }: Props) {
  const [form] = Form.useForm();

  const { data, isLoading } = useGetCompany();

  useEffect(() => {
    if (data && open) {
      form.setFieldsValue(data);
    } else if (!data && open) {
      form.resetFields();
    }
  }, [data, open, form]);

  const mutation = useUpdateCompany();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      mutation.mutate(values);
      onClose();
    } catch {
      // validation error
    }
  };

  return (
    <Modal
      title="Thông tin công ty"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={mutation.isPending}
      width={600}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item
            name="companyName"
            label="Tên công ty"
            rules={[{ required: true, message: "Vui lòng nhập tên công ty" }]}
          >
            <Input placeholder="Nhập tên công ty" />
          </Form.Item>

          <Form.Item name="taxCode" label="Mã số thuế">
            <Input placeholder="Nhập mã số thuế" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <TextArea rows={2} placeholder="Nhập địa chỉ" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Nhập email" />
          </Form.Item>

          <Form.Item name="headerText" label="Tiêu đề hóa đơn">
            <Input placeholder="VD: HÓA ĐƠN BÁN HÀNG" />
          </Form.Item>

          <Form.Item name="footerText" label="Chân trang hóa đơn">
            <TextArea rows={2} placeholder="Nội dung chân trang" />
          </Form.Item>

          <Form.Item name="logoUrl" label="URL Logo">
            <Input placeholder="Nhập URL logo công ty" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
