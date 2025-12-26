"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { formatCurrency, formatQuantity } from "@/utils/format";
import { DeleteOutlined, DownloadOutlined, PlusOutlined, SettingOutlined, SyncOutlined, UploadOutlined } from "@ant-design/icons";
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
    Switch,
    Table,
    Tag
} from "antd";
import { useEffect, useState } from "react";

interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: "PRODUCT" | "MATERIAL";
  productId?: number;
  materialId?: number;
  categoryId?: number;
  categoryName?: string;
  unit: string;
  costPrice: number;
  isActive: boolean;
  isSellable: boolean;
  sourceName?: string;
  sourceCode?: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  thickness?: number;
  otherSpecs?: string;
}



interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
}

export default function ItemsPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form] = Form.useForm();
  const { modal, message } = App.useApp();

  // BOM Modal state
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [selectedBOMItem, setSelectedBOMItem] = useState<Item | null>(null);
  const [bomForm] = Form.useForm();

  // Sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedItemsForSync, setSelectedItemsForSync] = useState<number[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  // Local filter state
  const [filterItemType, setFilterItemType] = useState<string | undefined>();
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>();
  const [filterIsSellable, setFilterIsSellable] = useState<boolean | undefined>();

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
    resetPage,
  } = useFilter();

  // Reset pagination khi thay đổi bất kỳ filter nào
  useEffect(() => {
    resetPage();
  }, [filterItemType, filterCategoryId, filterIsSellable]);

  // Fetch items using TanStack Query
  const {
    data: items = [],
    isLoading: itemsLoading,
    isFetching: itemsFetching,
  } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/products/items");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 5 * 60 * 1000, // Cache
    enabled: can("products.products", "view"),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/item-categories");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: can("products.products", "view"),
  });

  // Fetch branches for sync (Admin only)
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: can("products.products", "view"),
  });

  // Fetch materials for BOM
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: can("products.products", "view"),
  });

  // Fetch BOM for selected product
  const { data: bomItems = [], refetch: refetchBOM } = useQuery({
    queryKey: ["bom", selectedBOMItem?.productId],
    enabled: !!selectedBOMItem?.productId,
    queryFn: async () => {
      const res = await fetch(`/api/products/${selectedBOMItem?.productId}/bom`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/items/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa hàng hoá thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem
        ? `/api/products/items/${editingItem.id}`
        : "/api/products/items";
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
      message.success(
        editingItem ? "Cập nhật thành công" : "Tạo hàng hoá thành công"
      );
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      // Invalidate materials để cập nhật dropdown định mức
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    form.setFieldsValue({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType,
      categoryId: item.categoryId,
      unit: item.unit,
      costPrice: item.costPrice,
      isSellable: item.isSellable,
      brand: item.brand,
      model: item.model,
      color: item.color,
      size: item.size,
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
      thickness: item.thickness,
      otherSpecs: item.otherSpecs,
    });
    setShowModal(true);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa hàng hoá này?",
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

  const handleItemTypeChange = (type: string) => {
    // Khi đổi loại, set giá trị mặc định cho isSellable
    // PRODUCT = true (có thể bán), MATERIAL = false (không bán)
    form.setFieldsValue({
      isSellable: type === "PRODUCT",
      costPrice: 0,
    });
  };

  // Toggle sellable mutation
  const toggleSellableMutation = useMutation({
    mutationFn: async ({ id, isSellable }: { id: number; isSellable: boolean }) => {
      const res = await fetch(`/api/products/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSellable }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleToggleSellable = (item: Item) => {
    toggleSellableMutation.mutate({ id: item.id, isSellable: !item.isSellable });
  };

  // BOM handlers
  const handleOpenBOM = (item: Item) => {
    setSelectedBOMItem(item);
    setShowBOMModal(true);
  };

  const handleAddBOM = async () => {
    try {
      const values = await bomForm.validateFields();
      const res = await fetch(`/api/products/${selectedBOMItem?.productId}/bom`, {
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
    const res = await fetch(`/api/products/${selectedBOMItem?.productId}/bom/${bomId}`, {
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

  // Sync handlers
  const handleOpenSyncModal = () => {
    if (selectedItemsForSync.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 hàng hoá");
      return;
    }
    setShowSyncModal(true);
  };

  const handleSync = async (branchIds: number[]) => {
    if (selectedItemsForSync.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 hàng hoá");
      return;
    }
    if (!branchIds || branchIds.length === 0) {
      message.warning("Vui lòng chọn chi nhánh đích");
      return;
    }

    setSyncLoading(true);
    try {
      const res = await fetch("/api/products/items/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedItemsForSync,
          branchIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        setSelectedItemsForSync([]);
        setShowSyncModal(false);
        queryClient.invalidateQueries({ queryKey: ["items"] });
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      message.error("Có lỗi xảy ra khi đồng bộ");
    } finally {
      setSyncLoading(false);
    }
  };

  // Filter items using useFilter (for search) and local filters (for exact match)
  const filteredItems = applyFilter<Item>(items).filter((item: Item) => {
    if (filterItemType && item.itemType !== filterItemType) return false;
    if (filterCategoryId && item.categoryId !== filterCategoryId) return false;
    if (filterIsSellable !== undefined && item.isSellable !== filterIsSellable) return false;
    return true;
  });

  // Define table columns with required properties
  const defaultColumns = [
    {
      title: "Mã",
      dataIndex: "itemCode",
      key: "itemCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
    },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 100,
      render: (value: string) => (
        <Tag color={value === "PRODUCT" ? "blue" : "green"}>
          {value === "PRODUCT" ? "Sản phẩm" : "NVL"}
        </Tag>
      ),
    },
    {
      title: "Tên",
      dataIndex: "itemName",
      key: "itemName",
      width: 200,
    },
    {
      title: "ĐVT",
      dataIndex: "unit",
      key: "unit",
      width: 80,
    },
    {
      title: "Giá bán",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 120,
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Có thể bán",
      dataIndex: "isSellable",
      key: "isSellable",
      width: 110,
      render: (value: boolean, record: Item) => (
        <Switch
          checked={value}
          onChange={() => handleToggleSellable(record)}
          checkedChildren="Có"
          unCheckedChildren="Không"
          loading={toggleSellableMutation.isPending}
          disabled={!can("products.products", "edit")}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, record: Item) => (
        <TableActions
          canView={false}
          canEdit={can("products.products", "edit")}
          canDelete={can("products.products", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
          extraActions={record.itemType === "PRODUCT" && record.productId ? [
            {
              title: "Định mức NVL",
              icon: <SettingOutlined />,
              onClick: () => handleOpenBOM(record),
              can: can("products.products", "view"),
            },
          ] : undefined}
        />
      ),
    },
  ];

  // Initialize column visibility hook
  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Initialize file export hook
  const { exportToXlsx } = useFileExport(getVisibleColumns());
  const { openFileDialog } = useFileImport();

  // Handle export to Excel
  const handleExportExcel = () => {
    exportToXlsx(filteredItems, "items");
  };

  // Handle import from Excel
  const handleImportExcel = () => {
    openFileDialog(
      async (data: any[]) => {
        try {
          // Validate data - support both Vietnamese and English headers
          const validItems = data.filter((row: any) => {
            const itemName = row['itemName'] || row['Tên hàng'];
            const itemType = row['itemType'] || row['Loại'];
            const unit = row['unit'] || row['Đơn vị'];
            return itemName && itemType && unit;
          });

          if (validItems.length === 0) {
            message.error('Không có dữ liệu hợp lệ trong file Excel');
            return;
          }

          // Transform data
          const items = validItems.map((row: any) => {
            const itemType = row['itemType'] || row['Loại'];
            return {
              itemCode: row['itemCode'] || row['Mã hàng'] || undefined,
              itemName: row['itemName'] || row['Tên hàng'],
              itemType: itemType === 'MATERIAL' ? 'MATERIAL' : 'PRODUCT',
              unit: row['unit'] || row['Đơn vị'],
              costPrice: parseFloat(row['costPrice'] || row['Giá vốn']) || 0,
              isSellable: (row['isSellable'] || row['Có thể bán']) === 'TRUE' || itemType === 'PRODUCT',
            };
          });

          message.loading({ content: `Đang import ${items.length} hàng hoá...`, key: 'import' });

          // Call API for each item (bulk API chưa có)
          let successCount = 0;
          let errorCount = 0;

          for (const item of items) {
            try {
              const res = await fetch('/api/products/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
              });

              const result = await res.json();
              if (result.success) {
                successCount++;
              } else {
                errorCount++;
                console.error(`Lỗi import ${item.itemName}:`, result.error);
              }
            } catch (error) {
              errorCount++;
              console.error(`Lỗi import ${item.itemName}:`, error);
            }
          }

          message.success({
            content: `Import thành công ${successCount}/${items.length} hàng hoá${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
            key: 'import',
            duration: 3
          });

          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['materials'] });
        } catch (error) {
          message.error({ content: 'Có lỗi xảy ra khi import', key: 'import' });
          console.error('Import error:', error);
        }
      },
      (error: string) => {
        message.error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
        console.error('File read error:', error);
      }
    );
  };

  // Handle download template
  const handleDownloadTemplate = () => {
    window.open('/templates/import-hang-hoa.csv', '_blank');
  };

  return (
    <>
      <WrapperContent<Item>
        title="Quản lý hàng hoá"
        isNotAccessible={!can("products.products", "view")}
        isLoading={permLoading}
        isRefetching={itemsFetching}
        isEmpty={items.length === 0}
        header={{
          refetchDataWithKeys: ["items"],
          buttonEnds: [
            {
              can: can("products.products", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("products.products", "create") && selectedItemsForSync.length > 0,
              type: "default",
              name: `Đồng bộ (${selectedItemsForSync.length})`,
              onClick: handleOpenSyncModal,
              icon: <SyncOutlined />,
            },
            // {
            //   can: can("products.products", "create"),
            //   type: "default",
            //   name: "Tải mẫu",
            //   onClick: handleDownloadTemplate,
            //   icon: <FileExcelOutlined />,
            // },
            {
              can: can("products.products", "create"),
              type: "default",
              name: "Nhập Excel",
              onClick: handleImportExcel,
              icon: <UploadOutlined />,
            },
            {
              can: can("products.products", "view"),
              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã, tên hàng hoá...",
            filterKeys: ["itemCode", "itemName"],
            suggestions: {
              apiEndpoint: "/api/products/items",
              labelKey: "itemName",
              valueKey: "itemCode",
              descriptionKey: "categoryName",
            },
          },
          filters: {
            query,
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
          },
          customToolbarSecondRow: (
            <>
              <Select
                style={{ width: 160 }}
                placeholder="Loại hàng"
                allowClear
                value={filterItemType}
                onChange={setFilterItemType}
                options={[
                  { label: "Sản phẩm", value: "PRODUCT" },
                  { label: "Nguyên vật liệu", value: "MATERIAL" },
                ]}
              />
              <Select
                style={{ width: 180 }}
                placeholder="Danh mục"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={filterCategoryId}
                onChange={setFilterCategoryId}
                options={categories.map((c: ItemCategory) => ({
                  label: c.categoryName,
                  value: c.id,
                }))}
              />
              <Select
                style={{ width: 140 }}
                placeholder="Có thể bán"
                allowClear
                value={filterIsSellable}
                onChange={setFilterIsSellable}
                options={[
                  { label: "Có", value: true },
                  { label: "Không", value: false },
                ]}
              />
            </>
          ),
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          rowSelection={{
            selectedRowKeys: selectedItemsForSync,
            onChange: (keys: React.Key[]) => setSelectedItemsForSync(keys as number[]),
          }}
          DrawerDetails={({ data, onClose }: PropRowDetails<Item>) => (
            <div className="space-y-4">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Mã hàng">
                  {data?.itemCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên hàng hoá">
                  {data?.itemName}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục">
                  {data?.categoryName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Loại">
                  <Tag color={data?.itemType === "PRODUCT" ? "blue" : "green"}>
                    {data?.itemType === "PRODUCT" ? "Sản phẩm" : "NVL"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Nguồn">
                  {data?.sourceName} ({data?.sourceCode})
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị tính">
                  {data?.unit}
                </Descriptions.Item>
                <Descriptions.Item label="Giá bán">
                  {formatCurrency(data?.costPrice)}
                </Descriptions.Item>
                <Descriptions.Item label="Có thể bán">
                  <Tag color={data?.isSellable ? "green" : "default"}>
                    {data?.isSellable ? "Có" : "Không"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={data?.isActive ? "success" : "default"}>
                    {data?.isActive ? "Hoạt động" : "Ngừng"}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <Descriptions title="Thông tin chi tiết" bordered column={2} size="small">
                <Descriptions.Item label="Thương hiệu">{data?.brand || "-"}</Descriptions.Item>
                <Descriptions.Item label="Model">{data?.model || "-"}</Descriptions.Item>
                {/* <Descriptions.Item label="Màu sắc">{data?.color || "-"}</Descriptions.Item>
                <Descriptions.Item label="Size">{data?.size || "-"}</Descriptions.Item>
                <Descriptions.Item label="Dài (cm)">{data?.length || "-"}</Descriptions.Item>
                <Descriptions.Item label="Rộng (cm)">{data?.width || "-"}</Descriptions.Item>
                <Descriptions.Item label="Cao (cm)">{data?.height || "-"}</Descriptions.Item>
                <Descriptions.Item label="Cân nặng (kg)">{data?.weight || "-"}</Descriptions.Item>
                <Descriptions.Item label="Độ dày (mm)">{data?.thickness || "-"}</Descriptions.Item> */}
                <Descriptions.Item label="Thông số khác" span={2}>{data?.otherSpecs || "-"}</Descriptions.Item>
              </Descriptions>

              <div className="flex gap-2 justify-end mt-4">
                {data?.itemType === "PRODUCT" && data?.productId && can("products.products", "view") && (
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => {
                      handleOpenBOM(data);
                      onClose();
                    }}
                  >
                    Định mức NVL
                  </Button>
                )}
                {can("products.products", "edit") && (
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
                {can("products.products", "delete") && (
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
          dataSource={filteredItems as Item[]}
          loading={permLoading || itemsLoading || itemsFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa hàng hoá" : "Thêm hàng hoá"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={1000}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ isSellable: true }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Basic Info */}
            <div>
              <h3 className="font-medium mb-4 text-blue-600">Thông tin cơ bản</h3>
              {editingItem && (
                <Form.Item label="Mã hàng hoá">
                  <Input value={editingItem.itemCode} disabled />
                </Form.Item>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="itemType"
                  label="Loại hàng"
                  rules={[{ required: true, message: "Vui lòng chọn loại" }]}
                >
                  <Select
                    placeholder="Chọn loại"
                    onChange={handleItemTypeChange}
                    disabled={!!editingItem}
                  >
                    <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
                    <Select.Option value="MATERIAL">Nguyên vật liệu</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item name="categoryId" label="Danh mục">
                  <Select
                    placeholder="Chọn danh mục"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {categories.map((c: ItemCategory) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.categoryName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="itemName"
                label="Tên hàng hoá"
                rules={[{ required: true, message: "Vui lòng nhập tên" }]}
              >
                <Input placeholder="VD: Áo thun nam, Vải cotton..." />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="unit"
                  label="Đơn vị tính"
                  rules={[{ required: true, message: "Vui lòng chọn ĐVT" }]}
                >
                  <Select
                    placeholder="Đơn vị"
                    showSearch
                    allowClear
                    options={[
                      { label: "Cái", value: "Cái" },
                      { label: "Chiếc", value: "Chiếc" },
                      { label: "Bộ", value: "Bộ" },
                      { label: "Đôi", value: "Đôi" },
                      { label: "Mét", value: "Mét" },
                      { label: "Kg", value: "Kg" },
                      { label: "Gram", value: "Gram" },
                      { label: "Cuộn", value: "Cuộn" },
                      { label: "Tấm", value: "Tấm" },
                      { label: "Hộp", value: "Hộp" },
                      { label: "Gói", value: "Gói" },
                      { label: "Thùng", value: "Thùng" },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="costPrice" label="Giá bán">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    placeholder="0"
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="isSellable"
                label="Có thể bán"
              >
                <Select>
                  <Select.Option value={true}>Có - Hiển thị khi tạo đơn hàng</Select.Option>
                  <Select.Option value={false}>Không - Chỉ dùng nội bộ</Select.Option>
                </Select>
              </Form.Item>
            </div>

            {/* Right Column: Detailed Info */}
            <div className="border-l pl-6">
              <h3 className="font-medium mb-4 text-blue-600">Thông tin chi tiết</h3>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="brand" label="Thương hiệu">
                  <Input placeholder="VD: Nike..." />
                </Form.Item>
                <Form.Item name="model" label="Model">
                  <Input placeholder="VD: 2024..." />
                </Form.Item>
                {/* <Form.Item name="color" label="Màu sắc">
                  <Input placeholder="VD: Xanh..." />
                </Form.Item>
                <Form.Item name="size" label="Size">
                  <Input placeholder="VD: XL..." />
                </Form.Item> */}
              </div>

              {/* <div className="grid grid-cols-3 gap-4">
                <Form.Item name="length" label="Dài (cm)">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
                <Form.Item name="width" label="Rộng (cm)">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
                <Form.Item name="height" label="Cao (cm)">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
                <Form.Item name="weight" label="Nặng (kg)">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
                <Form.Item name="thickness" label="Dày (mm)">
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              </div> */}

              <Form.Item name="otherSpecs" label="Thông số khác">
                <Input.TextArea rows={4} placeholder="Các thông số kỹ thuật khác..." />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      {/* BOM Modal */}
      <Modal
        title={`Định mức NVL - ${selectedBOMItem?.itemName || ""}`
        }
        open={showBOMModal}
        onCancel={() => {
          setShowBOMModal(false);
          setSelectedBOMItem(null);
          bomForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <div className="space-y-4">
          {/* Form thêm định mức */}
          {can("products.products", "edit") && (
            <Form form={bomForm} layout="inline" className="mb-4">
              <Form.Item
                name="materialId"
                rules={[{ required: true, message: "Chọn NVL" }]}
                style={{ width: 300 }}
              >
                <Select 
                  placeholder="Chọn nguyên vật liệu" 
                  showSearch 
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(value) => {
                    // Tự động điền đơn vị khi chọn NVL
                    const selectedMaterial = materials.find((m: any) => m.id === value);
                    if (selectedMaterial) {
                      bomForm.setFieldsValue({ unit: selectedMaterial.unit });
                    }
                  }}
                >
                  {materials.map((m: any) => (
                    <Select.Option key={m.id} value={m.id}>
                      {m.materialName} ({m.materialCode}) - {m.unit}
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
                <Input placeholder="Đơn vị" style={{ width: 100 }} disabled />
              </Form.Item>
              <Form.Item>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBOM}>
                  Thêm
                </Button>
              </Form.Item>
            </Form>
          )}

          {/* Bảng định mức */}
          <Table
            dataSource={bomItems}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: "Mã NVL",
                dataIndex: "materialCode",
                key: "materialCode",
                width: 100,
              },
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
                align: "right" as const,
                render: (value: number) => formatQuantity(value),
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
              ...(can("products.products", "delete") ? [{
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
              }] : []),
            ]}
          />

          {bomItems.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Chưa có định mức NVL. Thêm nguyên vật liệu cần thiết để sản xuất sản phẩm này.
            </div>
          )}
        </div>
      </Modal>

      {/* Sync Modal */}
      <Modal
        title={`Đồng bộ ${selectedItemsForSync.length} hàng hoá sang chi nhánh khác`}
        open={showSyncModal}
        onCancel={() => setShowSyncModal(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Chọn chi nhánh để đồng bộ hàng hoá. Hàng hoá đã tồn tại (cùng mã) sẽ được bỏ qua.
          </p>

          <Form
            layout="vertical"
            onFinish={(values) => handleSync(values.branchIds)}
          >
            <Form.Item
              name="branchIds"
              label="Chi nhánh đích"
              rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 chi nhánh" }]}
            >
              <Select
                mode="multiple"
                placeholder="Chọn chi nhánh"
                style={{ width: "100%" }}
                options={branches.map((b: any) => ({
                  label: b.branchName,
                  value: b.id,
                }))}
              />
            </Form.Item>

            <div className="bg-blue-50 p-3 rounded mb-4">
              <p className="text-sm text-blue-700">
                <strong>Lưu ý:</strong> Đồng bộ sẽ tạo bản sao hàng hoá (sản phẩm/NVL) cho chi nhánh được chọn.
                Định mức NVL (BOM) của sản phẩm cũng sẽ được đồng bộ.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowSyncModal(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={syncLoading} icon={<SyncOutlined />}>
                Đồng bộ
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
