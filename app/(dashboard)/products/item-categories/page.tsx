"use client";

import AttributeManager from "@/components/AttributeManager";
import CategoryAttributesViewer from "@/components/CategoryAttributesViewer";
import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { DownloadOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tag
} from "antd";
import { useState } from "react";

const { TextArea } = Input;

interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ItemCategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(
    null
  );
  const [managingCategory, setManagingCategory] = useState<ItemCategory | null>(null);
  const [form] = Form.useForm();
  const [expandedKeys, setExpandedKeys] = useState<Set<number>>(new Set());

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Fetch categories using TanStack Query
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
  } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/item-categories");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("products.categories", "view"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/item-categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingCategory
        ? `/api/products/item-categories/${editingCategory.id}`
        : "/api/products/item-categories";
      const method = editingCategory ? "PUT" : "POST";

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
      message.success(
        editingCategory ? "Cập nhật thành công" : "Tạo danh mục thành công"
      );
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
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

  const handleEdit = (category: ItemCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId || undefined,
      description: category.description,
    });
    setShowModal(true);
  };

  const handleManageAttributes = (category: ItemCategory) => {
    setManagingCategory(category);
  };

  const onConfirmDelete = (id: number) => {
    Modal.confirm({
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
      saveMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  // Build tree structure
  const buildTree = (items: ItemCategory[]) => {
    const map = new Map<number, ItemCategory & { children?: ItemCategory[] }>();
    const roots: (ItemCategory & { children?: ItemCategory[] })[] = [];

    // Create map
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    // Build tree
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        const parent = map.get(item.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Flatten tree with level info and respect expanded state
  const flattenTree = (
    items: (ItemCategory & { children?: ItemCategory[] })[],
    level = 0
  ): (ItemCategory & { level: number; hasChildren: boolean })[] => {
    const result: (ItemCategory & { level: number; hasChildren: boolean })[] = [];
    items.forEach((item) => {
      const hasChildren = (item.children && item.children.length > 0) || false;
      result.push({ ...item, level, hasChildren });

      // Only show children if parent is expanded
      if (hasChildren && expandedKeys.has(item.id)) {
        result.push(...flattenTree(item.children!, level + 1));
      }
    });
    return result;
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedKeys(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    categories.forEach((cat: ItemCategory) => {
      if (categories.some((c: ItemCategory) => c.parentId === cat.id)) {
        allIds.add(cat.id);
      }
    });
    setExpandedKeys(allIds);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Filter categories using useFilter with custom logic
  let filteredCategories = applyFilter(categories);

  // Apply custom filters for isActive
  if (query.isActive !== undefined && query.isActive !== null && query.isActive !== "") {
    const isActiveValue = query.isActive === true || query.isActive === "true";
    filteredCategories = filteredCategories.filter((c: ItemCategory) => c.isActive === isActiveValue);
  }

  // Build tree and flatten for display
  const treeData = buildTree(filteredCategories);
  const displayData = flattenTree(treeData);

  // Define table columns with required properties
  const defaultColumns = [
    {
      title: "Mã",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 100,
      fixed: "left" as const,
      render: (text: string, record: ItemCategory & { level?: number }) => {
        const level = record.level || 0;
        return (
          <Tag color={level === 0 ? "blue" : "default"} style={{ fontFamily: 'monospace' }}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 280,
      render: (text: string, record: ItemCategory & { level?: number; hasChildren?: boolean }) => {
        const level = record.level || 0;
        const indent = level * 20;
        const hasChildren = record.hasChildren || false;
        const isExpanded = expandedKeys.has(record.id);

        if (level === 0) {
          return (
            <div style={{ paddingLeft: `${indent}px`, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {hasChildren ? (
                <span
                  onClick={(e) => { e.stopPropagation(); toggleExpand(record.id); }}
                  style={{
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#1890ff',
                    userSelect: 'none',
                    width: '16px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '2px',
                    background: '#e6f7ff',
                  }}
                >
                  {isExpanded ? '▼' : '▶'}
                </span>
              ) : (
                <span style={{ width: '16px', display: 'inline-block' }}></span>
              )}
              <span style={{ fontSize: '14px' }}>📁</span>
              <span style={{ fontWeight: 600, color: '#1890ff' }}>{text}</span>
            </div>
          );
        } else {
          return (
            <div style={{ paddingLeft: `${indent}px`, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#d9d9d9', fontSize: '12px', marginLeft: '16px' }}>└</span>
              <span style={{ fontSize: '12px' }}>📄</span>
              <span style={{ color: '#595959' }}>{text}</span>
            </div>
          );
        }
      },
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentName",
      key: "parentName",
      width: 150,
      render: (val: string | undefined) => {
        if (!val) {
          return <Tag color="blue">Gốc</Tag>;
        }
        return <span style={{ color: '#1890ff' }}>{val}</span>;
      },
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 250,
      render: (text: string) => (
        <span style={{ color: text ? '#595959' : '#bfbfbf' }}>
          {text || '—'}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (_: boolean, record: ItemCategory) => (
        <Tag color={record.isActive ? "success" : "default"}>
          {record.isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      fixed: "right" as const,
      render: (_: unknown, record: ItemCategory) => (
        <TableActions
          canView={false}
          canEdit={can("products.categories", "edit")}
          canDelete={can("products.categories", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
          extraActions={[
            {
              title: "Thuộc tính",
              icon: <SettingOutlined />,
              onClick: () => handleManageAttributes(record),
              can: can("products.categories", "edit"),
            },
          ]}
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
    exportToXlsx(filteredCategories, "item-categories");
  };
  return (
    <>
      <WrapperContent<ItemCategory>
        title="Danh mục hàng hoá"
        isNotAccessible={!can("products.categories", "view")}
        isLoading={permLoading}
        isRefetching={categoriesFetching}
        isEmpty={categories.length === 0}
        header={{
          buttonBackTo: "/dashboard/products",
          refetchDataWithKeys: ["item-categories"],
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
              name: "Mở rộng tất cả",
              onClick: expandAll,
              icon: undefined
            },
            {
              can: can("products.categories", "view"),
              type: "default",
              name: "Thu gọn tất cả",
              onClick: collapseAll,
              icon: undefined
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
            filterKeys: ["categoryCode", "categoryName"],
          },
          customToolbar: (
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: 150 }}
                value={query.isActive !== undefined && query.isActive !== "" ? query.isActive : undefined}
                onChange={(value) => updateQueries([{ key: "isActive", value: value ?? "" }])}
                options={[
                  { label: "Hoạt động", value: true },
                  { label: "Ngừng", value: false },
                ]}
              />

              {(query.isActive !== undefined && query.isActive !== "") && (
                <Button onClick={reset} size="middle">
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ),
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          DrawerDetails={({ data, onClose }: PropRowDetails<ItemCategory>) => {
            return (
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
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={data?.isActive ? "success" : "default"}>
                      {data?.isActive ? "Hoạt động" : "Ngừng"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tạo">
                    {data?.createdAt}
                  </Descriptions.Item>
                </Descriptions>

                {data && (
                  <CategoryAttributesViewer
                    categoryId={data.id}
                    onManage={() => {
                      handleManageAttributes(data);
                    }}
                    onEdit={() => {
                      handleEdit(data);
                      onClose();
                    }}
                    onDelete={() => {
                      onConfirmDelete(data.id);
                    }}
                    canEdit={can("products.categories", "edit")}
                    canDelete={can("products.categories", "delete")}
                  />
                )}

                {/* <div className="flex gap-2 justify-end mt-4">
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
                </div> */}
              </div>
            );
          }}
          columns={getVisibleColumns()}
          dataSource={displayData as ItemCategory[]}
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
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical">
          {editingCategory && (
            <Form.Item label="Mã danh mục">
              <Input value={editingCategory.categoryCode} disabled />
            </Form.Item>
          )}

          <Form.Item 
            name="parentId" 
            label="Danh mục cha"
          >
            <Select
              placeholder="Chọn danh mục cha (để trống nếu là danh mục gốc)"
              allowClear
              showSearch
              optionFilterProp="children"
              options={categories
                .filter((c: ItemCategory) => !editingCategory || c.id !== editingCategory.id)
                .filter((c: ItemCategory) => !c.parentId)
                .map((c: ItemCategory) => ({
                  label: `📁 ${c.categoryName} (${c.categoryCode})`,
                  value: c.id,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="categoryName"
            label="Tên danh mục"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>
        </Form>
      </Modal>

      <AttributeManager
        categoryId={managingCategory?.id || null}
        categoryName={managingCategory?.categoryName}
        open={!!managingCategory}
        onClose={() => setManagingCategory(null)}
      />
    </>
  );
}
