"use client";

import { Category, CategoryFormValues } from "@/types/category";
import { Button, Form, Input, Select } from "antd";

function CategoryForm({
  mode,
  initialValues,
  categories,
  excludeId,
  onCancel,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  initialValues?: Partial<CategoryFormValues>;
  categories: Category[];
  excludeId?: number;
  onCancel: () => void;
  onSubmit: (v: CategoryFormValues) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<CategoryFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as CategoryFormValues)}
    >
      <Form.Item
        name="categoryCode"
        label="Mã danh mục"
        rules={[{ required: true, message: "Vui lòng nhập mã danh mục" }]}
      >
        <Input disabled={mode === "edit"} />
      </Form.Item>
      <Form.Item
        name="categoryName"
        label="Tên danh mục"
        rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="parentId" label="Danh mục cha">
        <Select allowClear placeholder="-- Không có --">
          {categories
            .filter((c) => c.id !== excludeId)
            .map((cat) => (
              <Select.Option key={cat.id} value={cat.id}>
                {cat.categoryName}
              </Select.Option>
            ))}
        </Select>
      </Form.Item>
      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} />
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

export default CategoryForm;
