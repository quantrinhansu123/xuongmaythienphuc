"use client";

import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Row,
  Col,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Card,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Product, CreateProductDto } from "@/services/productService";
import type { Category, Material } from "@/services/productService";
import { useCategories, useMaterials } from "@/hooks/useProductQuery";
import { parser } from "@/utils/parser";

export type BomItem = {
  materialId: number;
  quantity: number;
  unit: string;
  notes?: string;
};

export type ProductFormValues = CreateProductDto & { bom?: BomItem[] };

type Props = {
  open: boolean;
  mode: "create" | "edit";
  product: Product | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: ProductFormValues) => void;
};

export default function ProductFormModal({
  open,
  mode,
  product,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();
  const { data: categories = [] } = useCategories();
  const { data: materials = [] } = useMaterials();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && product) {
        form.setFieldsValue({
          productCode: product.productCode,
          productName: product.productName,
          categoryId: product.categoryId,
          unit: product.unit,
          costPrice: product.costPrice,
          description: product.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, mode, product, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const { bom, ...rest } = values as ProductFormValues;
      const payload: ProductFormValues = {
        ...rest,
        bom: bom?.map((b: BomItem) => ({
          materialId: b.materialId,
          quantity: b.quantity,
          unit: b.unit,
          notes: b.notes,
        })),
      };
      onSubmit(payload);
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Tạo sản phẩm" : "Sửa sản phẩm"}
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      width={780}
      okText={mode === "create" ? "Tạo" : "Cập nhật"}
      cancelText="Hủy"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="productCode"
              label="Mã sản phẩm"
              rules={[{ required: true }]}
            >
              <Input
                placeholder="Nhập mã sản phẩm"
                disabled={mode === "edit"}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="productName"
              label="Tên sản phẩm"
              rules={[{ required: true }]}
            >
              <Input placeholder="Nhập tên sản phẩm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="categoryId" label="Danh mục">
              <Select
                allowClear
                placeholder="Chọn danh mục"
                options={categories.map((c: Category) => ({
                  label: c.categoryName,
                  value: c.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
              <Input placeholder="Đơn vị" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="costPrice" label="Giá vốn">
          <InputNumber
            className="w-full"
            min={0}
            formatter={(v) => `${v}`.replace(/\(?=(\d{3})+(?!\d))/g, ",")}
            parser={parser}
          />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả sản phẩm" />
        </Form.Item>

        <Form.Item label="Định mức nguyên liệu (BOM)">
          <Form.List name="bom">
            {(fields, { add, remove }) => (
              <>
                <Space vertical className="w-full">
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      }
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, "materialId"]}
                            label="Nguyên vật liệu"
                            rules={[{ required: true }]}
                          >
                            <Select placeholder="Chọn nguyên vật liệu">
                              {materials.map((m: Material) => (
                                <Select.Option key={m.id} value={m.id}>
                                  {m.materialName} ({m.unit})
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, "quantity"]}
                            label="Số lượng"
                            rules={[{ required: true }]}
                          >
                            <InputNumber
                              className="w-full"
                              min={0}
                              step={0.001}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, "unit"]}
                            label="Đơn vị"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        {...restField}
                        name={[name, "notes"]}
                        label="Ghi chú"
                      >
                        <Input />
                      </Form.Item>
                    </Card>
                  ))}
                </Space>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  className="mt-4"
                >
                  Thêm nguyên vật liệu
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  );
}
