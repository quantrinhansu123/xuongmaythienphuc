"use client";

import { WarehouseType } from "@/types/enum";
import { WarehouseFormValues, WarehouseOptions } from "@/types/warehouse";
import { Button, Form, Input, Select, Switch } from "antd";

function WarehouseForm({
  initialValues,
  branches,
  onCancel,
  onSubmit,
  loading,
  mode = "create",
}: {
  initialValues?: Partial<WarehouseFormValues>;
  branches: { id: number; branchName: string }[];
  onCancel: () => void;
  onSubmit: (v: WarehouseFormValues) => void;
  loading?: boolean;
  mode?: "create" | "edit";
}) {
  const [form] = Form.useForm<WarehouseFormValues>();
  const isEdit = mode === "edit";

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as WarehouseFormValues)}
    >
      {isEdit && (
        <Form.Item label="Mã kho">
          <Input value={initialValues?.warehouseCode} disabled />
        </Form.Item>
      )}
      <Form.Item
        name="warehouseName"
        label="Tên kho"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="warehouseType"
        label="Loại kho"
        rules={[{ required: true }]}
      >
        <Select<WarehouseType> options={WarehouseOptions} />
      </Form.Item>
      <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true }]}>
        <Select>
          {branches.map((b) => (
            <Select.Option key={b.id} value={b.id}>
              {b.branchName}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="address" label="Địa chỉ">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
        <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
      </Form.Item>
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Lưu
        </Button>
      </div>
    </Form>
  );
}
export default WarehouseForm;
