"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { Category, CategoryFormValues } from "@/types/category";
import { PropRowDetails } from "@/types/table";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Select,
} from "antd";
import { useState } from "react";

const { TextArea } = Input;

export default function CategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/categories");
      const body = await res.json();
      return body.success ? body.data : [];
    },
    enabled: can("products.categories", "view"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      message.success("Tạo danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CategoryFormValues>;
    }) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      message.success("Xóa danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId,
      description: category.description,
    });
    setShowModal(true);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa danh mục này?",
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
      if (editingCategory) {
        updateMutation.mutate({ id: editingCategory.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch {
      // validation error
    }
  };

  // Filter categories using useFilter
  const filteredCategories = applyFilter(categories);

  // Define table columns with required properties
  const defaultColumns = [
    {
      title: "Mã danh mục",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 140,
      fixed: "left" as const,
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 220,
    },
    {
      title: "Cấp độ",
      dataIndex: "parentName",
      key: "parentName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Category) => (
        <TableActions
          canView={false}
          canEdit={can("products.categories", "edit")}
          canDelete={can("products.categories", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
        />
      ),
    },
  ];

  // Initialize column visibility hook
  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Initialize file export hook
  const { exportToXlsx } = useFileExport(getVisibleColumns());

  // Handle export to Excel
  const handleExportExcel = () => {
    exportToXlsx(filteredCategories, "categories");
  };

  return (
    <>
      <WrapperContent<Category>
        title="Danh mục sản phẩm"
        isNotAccessible={!can("products.categories", "view")}
        isLoading={permLoading}
        isRefetching={categoriesFetching}
        isEmpty={categories.length === 0}
        header={{
          buttonBackTo: "/products/items",
          refetchDataWithKeys: ["categories"],
          buttonEnds: [
            {
              can: can("products.categories", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("products.categories", "view"),
              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã, tên danh mục...",
            filterKeys: ["categoryCode", "categoryName", "description"],
          },
          filters: {
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
          DrawerDetails={({ data, onClose }: PropRowDetails<Category>) => (
            <div className="space-y-4">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Mã danh mục">
                  {data?.categoryCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên danh mục">
                  {data?.categoryName}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục cha">
                  {data?.parentName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {data?.description || "-"}
                </Descriptions.Item>
              </Descriptions>

              <div className="flex gap-2 justify-end mt-4">
                {can("products.categories", "edit") && (
                  <Button
                    type="primary"
                    onClick={() => {
                      if (data) {
                        handleEdit(data);
                        onClose();
                      }
                    }}
                  >
                    Sửa
                  </Button>
                )}
                {can("products.categories", "delete") && (
                  <Button
                    danger
                    onClick={() => {
                      if (data) {
                        onConfirmDelete(data.id);
                      }
                    }}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </div>
          )}
          columns={getVisibleColumns()}
          dataSource={filteredCategories as Category[]}
          loading={permLoading || categoriesLoading || categoriesFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="categoryCode"
            label="Mã danh mục"
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
          >
            <Input placeholder="VD: DM001" disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item
            name="categoryName"
            label="Tên danh mục"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item name="parentId" label="Danh mục cha">
            <Select
              placeholder="Chọn danh mục cha (nếu có)"
              allowClear
              showSearch
            >
              {categories
                .filter(
                  (c: Category) =>
                    !editingCategory || c.id !== editingCategory.id
                )
                .map((c: Category) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.categoryName} ({c.categoryCode})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
