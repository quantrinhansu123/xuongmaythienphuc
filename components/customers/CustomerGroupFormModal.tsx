"use client";

import type { CustomerGroup } from "@/services/customerGroupService";
import { DeleteOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Divider, Form, Input, InputNumber, Modal, Spin, Table, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";

export interface CategoryPrice {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  priceMultiplier: number;
  isCustom: boolean;
}

export interface CustomerGroupFormValues {
  groupCode: string;
  groupName: string;
  priceMultiplier: number;
  description?: string;
  categoryPrices?: CategoryPrice[];
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
  const [allCategories, setAllCategories] = useState<CategoryPrice[]>([]);
  const [customPrices, setCustomPrices] = useState<CategoryPrice[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && group) {
        form.setFieldsValue({
          groupCode: group.groupCode,
          groupName: group.groupName,
          priceMultiplier: group.priceMultiplier,
          description: group.description,
        });
        fetchCategoryPrices(group.id);
      } else {
        form.resetFields();
        form.setFieldsValue({ priceMultiplier: 0 });
        setAllCategories([]);
        setCustomPrices([]);
      }
      setSearchText("");
    }
  }, [open, mode, group, form]);

  const fetchCategoryPrices = async (groupId: number) => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`/api/sales/customer-groups/${groupId}/category-prices`);
      const result = await res.json();
      if (result.success) {
        const data = result.data || [];
        setAllCategories(data);
        // Chỉ lấy những cái đã có custom price
        setCustomPrices(data.filter((cp: CategoryPrice) => cp.isCustom));
      }
    } catch (error) {
      console.error("Error fetching category prices:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handlePriceChange = (categoryId: number, value: number | null) => {
    setCustomPrices(prev =>
      prev.map(cp =>
        cp.categoryId === categoryId
          ? { ...cp, priceMultiplier: value ?? 0 }
          : cp
      )
    );
  };

  const handleAddCategory = (category: CategoryPrice) => {
    if (!customPrices.find(cp => cp.categoryId === category.categoryId)) {
      setCustomPrices(prev => [...prev, { ...category, isCustom: true }]);
    }
    setShowAddModal(false);
    setSearchText("");
  };

  const handleRemoveCategory = (categoryId: number) => {
    setCustomPrices(prev => prev.filter(cp => cp.categoryId !== categoryId));
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        categoryPrices: customPrices.map(cp => ({
          categoryId: cp.categoryId,
          priceMultiplier: cp.priceMultiplier,
        })),
      });
    });
  };

  // Danh mục chưa được thêm vào custom list
  const availableCategories = allCategories.filter(
    c => !customPrices.find(cp => cp.categoryId === c.categoryId) &&
      (c.categoryCode.toLowerCase().includes(searchText.toLowerCase()) ||
        c.categoryName.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <Modal
      title={mode === "create" ? "Thêm nhóm khách hàng mới" : "Chỉnh sửa nhóm khách hàng"}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText={mode === "create" ? "Tạo mới" : "Cập nhật"}
      cancelText="Hủy"
      width={750}
    >
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="priceMultiplier"
            label="Hệ số giá mặc định (%)"
            rules={[
              { required: true, message: "Vui lòng nhập hệ số giá" },
            ]}
            tooltip="Áp dụng cho tất cả danh mục chưa cấu hình riêng"
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
            <Input placeholder="Nhập mô tả về nhóm" />
          </Form.Item>
        </div>

        {mode === "edit" && (
          <>
            <Divider className="my-3" />
            <div className="flex items-center justify-between mb-3">
              <Typography.Title level={5} className="!mb-0">
                Hệ số giá theo danh mục
              </Typography.Title>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setShowAddModal(true)}
                disabled={loadingCategories}
              >
                Thêm danh mục
              </Button>
            </div>
            <Typography.Text type="secondary" className="text-xs mb-3 block">
              Chỉ cấu hình cho danh mục có hệ số khác mặc định. Các danh mục khác dùng hệ số mặc định.
            </Typography.Text>

            {loadingCategories ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : customPrices.length === 0 ? (
              <div className="text-gray-400 text-center py-4 border border-dashed rounded">
                Chưa có danh mục nào được cấu hình riêng
              </div>
            ) : (
              <Table
                dataSource={customPrices}
                rowKey="categoryId"
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
                columns={[
                  {
                    title: "Mã",
                    dataIndex: "categoryCode",
                    key: "categoryCode",
                    width: 100,
                    render: (val: string) => <span className="font-mono text-xs">{val}</span>,
                  },
                  {
                    title: "Danh mục",
                    dataIndex: "categoryName",
                    key: "categoryName",
                  },
                  {
                    title: "Hệ số giá (%)",
                    dataIndex: "priceMultiplier",
                    key: "priceMultiplier",
                    width: 140,
                    render: (val: number, record: CategoryPrice) => (
                      <InputNumber
                        size="small"
                        value={val}
                        min={0}
                        max={100}
                        step={0.1}
                        addonAfter="%"
                        onChange={(v) => handlePriceChange(record.categoryId, v)}
                        style={{ width: 110 }}
                      />
                    ),
                  },
                  {
                    title: "",
                    key: "action",
                    width: 50,
                    render: (_: any, record: CategoryPrice) => (
                      <Tooltip title="Xóa cấu hình riêng">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveCategory(record.categoryId)}
                        />
                      </Tooltip>
                    ),
                  },
                ]}
              />
            )}
          </>
        )}
      </Form>

      {/* Modal thêm danh mục */}
      <Modal
        title="Chọn danh mục để cấu hình hệ số giá riêng"
        open={showAddModal}
        onCancel={() => { setShowAddModal(false); setSearchText(""); }}
        footer={null}
        width={500}
      >
        <Input
          placeholder="Tìm kiếm danh mục..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="mb-3"
          allowClear
        />
        <div className="max-h-64 overflow-y-auto">
          {availableCategories.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              {searchText ? "Không tìm thấy danh mục" : "Đã cấu hình hết danh mục"}
            </div>
          ) : (
            <div className="space-y-1">
              {availableCategories.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer border"
                  onClick={() => handleAddCategory(cat)}
                >
                  <div>
                    <Tag className="font-mono">{cat.categoryCode}</Tag>
                    <span className="font-medium">{cat.categoryName}</span>
                  </div>
                  <Button type="link" size="small" icon={<PlusOutlined />}>
                    Thêm
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </Modal>
  );
}
