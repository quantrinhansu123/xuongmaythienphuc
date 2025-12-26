"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
    PRODUCT_KEYS,
    useCategories,
    useProducts,
} from "@/hooks/useProductQuery";
import type { Product } from "@/services/productService";
import { PropRowDetails } from "@/types/table";
import { formatCurrency } from "@/utils/format";
import {
    CheckCircleOutlined,
    DeleteOutlined,
    DownloadOutlined,
    PlusOutlined,
    StopOutlined,
    UnorderedListOutlined,
    UploadOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    App,
    Button,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Table,
    Tag,
    type TableColumnsType
} from "antd";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const { can, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const searchParams = useSearchParams();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // BOM Modal state
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bomForm] = Form.useForm();

  // Filter hook
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Column visibility hook
  const defaultColumns = [
    {
      title: "Mã",
      dataIndex: "productCode",
      key: "productCode",
      width: 100,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      width: 160,
      fixed: "left" as const,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 200,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
      render: (text: string) => text || "-",
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
    },
    {
      title: "Giá vốn",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 120,
      render: (value: number) =>
        value ? formatCurrency(value) : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        >
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      fixed: "right" as const,
      render: (_: unknown, record: Product) => (
        <TableActions
          canEdit={can("products.products", "edit")}
          canDelete={can("products.products", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
          extraActions={[
            {
              title: "Định mức NVL",
              icon: <UnorderedListOutlined />,
              onClick: () => handleOpenBOM(record),
              can: can("products.products", "view"),
            },
          ]}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Data hooks
  const { data: branches = [] } = useBranches();
  const { data: products = [], isLoading, isFetching } = useProducts();
  const { data: categories = [] } = useCategories();

  // Fetch materials for BOM
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  // Fetch BOM for selected product
  const { data: bomItems = [], refetch: refetchBOM } = useQuery({
    queryKey: ["bom", selectedProduct?.id],
    enabled: !!selectedProduct?.id,
    queryFn: async () => {
      const res = await fetch(`/api/products/${selectedProduct?.id}/bom`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  // Auto open BOM modal from query param
  useEffect(() => {
    const bomProductId = searchParams.get('bomProductId');
    if (bomProductId && products.length > 0) {
      const product = products.find((p: Product) => p.id === parseInt(bomProductId));
      if (product) {
        setSelectedProduct(product);
        setShowBOMModal(true);
      }
    }
  }, [searchParams, products]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa thành công");
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem
        ? `/api/products/${editingItem.id}`
        : "/api/products";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success(editingItem ? "Cập nhật thành công" : "Tạo thành công");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Event handlers
  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setShowModal(true);
  };

  const handleView = (item: Product) => {
    setEditingItem(item);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa sản phẩm này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  // BOM handlers
  const handleOpenBOM = (product: Product) => {
    setSelectedProduct(product);
    setShowBOMModal(true);
  };

  const handleAddBOM = async () => {
    try {
      const values = await bomForm.validateFields();
      const res = await fetch(`/api/products/${selectedProduct?.id}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success("Thêm định mức thành công");
        bomForm.resetFields();
        refetchBOM();
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      // validation error
    }
  };

  const handleDeleteBOM = async (bomId: number) => {
    const res = await fetch(`/api/products/${selectedProduct?.id}/bom/${bomId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      message.success("Xóa định mức thành công");
      refetchBOM();
    } else {
      message.error(data.error || "Có lỗi xảy ra");
    }
  };

  // Apply client-side filtering
  const filteredProducts = applyFilter(products);

  // Export handler (placeholder)
  const handleExportExcel = () => {
    // TODO: Implement export functionality
  };

  const columns: TableColumnsType<Product> = getVisibleColumns();

  return (
    <>
      <WrapperContent<Product>
        title="Sản phẩm"
        isNotAccessible={!can("products.products", "view")}
        isLoading={isLoading || isFetching}
        isEmpty={!products?.length}
        header={{
          buttonBackTo: "/products/items",
          refetchDataWithKeys: PRODUCT_KEYS.all,
          buttonEnds: can("products.products", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: handleCreate,
                  icon: <PlusOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default",
                  name: "Nhập Excel",
                  onClick: () => {},
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm sản phẩm",
            filterKeys: [
              "productCode",
              "productName",
              "categoryName",
              "description",
              "costPrice",
              "unit",
              "branchName",
            ],
            suggestions: {
              apiEndpoint: "/api/products",
              labelKey: "productName",
              valueKey: "productCode",
              descriptionKey: "categoryName",
            },
          },
          filters: {
            fields: [
              ...(isAdmin
                ? [
                    {
                      type: "select" as const,
                      name: "branchId",
                      label: "Chi nhánh",
                      options: branches.map((branch) => ({
                        label: branch.branchName,
                        value: branch.id.toString(),
                      })),
                    },
                  ]
                : []),
              {
                type: "select",
                name: "categoryId",
                label: "Danh mục",
                options: categories.map((cat) => ({
                  label: cat.categoryName,
                  value: cat.id.toString(),
                })),
              },
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Khóa", value: "false" },
                ],
              },
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          DrawerDetails={({ data }: PropRowDetails<Product>) => (
            <div>
              <Descriptions title="Thông tin sản phẩm" bordered column={2}>
                <Descriptions.Item label="Mã sản phẩm">
                  {data?.productCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên sản phẩm">
                  {data?.productName}
                </Descriptions.Item>
                <Descriptions.Item label="Chi nhánh">
                  {data?.branchName}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục">
                  {data?.categoryName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị">
                  {data?.unit}
                </Descriptions.Item>
                <Descriptions.Item label="Giá vốn">
                  {data?.costPrice
                    ? formatCurrency(data.costPrice)
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={data?.isActive ? "success" : "error"}
                    icon={
                      data?.isActive ? (
                        <CheckCircleOutlined />
                      ) : (
                        <StopOutlined />
                      )
                    }
                  >
                    {data?.isActive ? "Hoạt động" : "Khóa"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {data?.description || "-"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
          columns={columns}
          dataSource={filteredProducts as Product[]}
          loading={isLoading || deleteMutation.isPending || isFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saveMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="productCode"
            label="Mã sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập mã sản phẩm" }]}
          >
            <Input placeholder="Nhập mã sản phẩm" />
          </Form.Item>
          <Form.Item
            name="productName"
            label="Tên sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>
          <Form.Item name="categoryId" label="Danh mục">
            <Select placeholder="Chọn danh mục">
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị">
            <Input placeholder="Nhập đơn vị" />
          </Form.Item>
          <Form.Item name="costPrice" label="Giá vốn">
            <Input type="number" placeholder="Nhập giá vốn" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* BOM Modal */}
      <Modal
        title={`Định mức NVL - ${selectedProduct?.productName || ""}`}
        open={showBOMModal}
        onCancel={() => {
          setShowBOMModal(false);
          setSelectedProduct(null);
          bomForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          {/* Form thêm định mức */}
          <Form form={bomForm} layout="inline" className="mb-4">
            <Form.Item
              name="materialId"
              rules={[{ required: true, message: "Chọn NVL" }]}
              style={{ width: 300 }}
            >
              <Select placeholder="Chọn nguyên vật liệu" showSearch optionFilterProp="children">
                {materials.map((m: any) => (
                  <Select.Option key={m.id} value={m.id}>
                    {m.materialName} ({m.materialCode})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="quantity"
              rules={[{ required: true, message: "Nhập số lượng" }]}
            >
              <InputNumber placeholder="Số lượng" min={0.001} step={0.1} />
            </Form.Item>
            <Form.Item name="unit">
              <Input placeholder="Đơn vị" style={{ width: 100 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBOM}>
                Thêm
              </Button>
            </Form.Item>
          </Form>

          {/* Bảng định mức */}
          <Table
            dataSource={bomItems}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: "Nguyên vật liệu",
                dataIndex: "materialName",
                key: "materialName",
              },
              {
                title: "Số lượng",
                dataIndex: "quantity",
                key: "quantity",
                width: 100,
                align: "right",
              },
              {
                title: "Đơn vị",
                dataIndex: "unit",
                key: "unit",
                width: 80,
              },
              {
                title: "Ghi chú",
                dataIndex: "notes",
                key: "notes",
                width: 150,
              },
              {
                title: "",
                key: "action",
                width: 60,
                render: (_: any, record: any) => (
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteBOM(record.id)}
                  />
                ),
              },
            ]}
          />
        </div>
      </Modal>
    </>
  );
}
