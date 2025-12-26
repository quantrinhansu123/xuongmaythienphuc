"use client";

import CommonTable from "@/components/CommonTable";
import WarehouseForm from "@/components/WarehouseForm";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { WarehouseType } from "@/types/enum";
import {
    Warehouse,
    WarehouseFormValues,
    WarehouseOptions,
} from "@/types/warehouse";
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    MoreOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions, Drawer, Dropdown, Modal, Tag } from "antd";
import { useState } from "react";

export default function WarehousesPage() {
  const { can } = usePermissions();
  const { data: branches = [] } = useBranches();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();

  const {
    data: warehouses = [],
    isLoading,
    isFetching,
  } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseFormValues) => {
      const res = await fetch("/api/admin/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<WarehouseFormValues>;
    }) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const filtered = applyFilter<Warehouse>(warehouses);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (row: Warehouse) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Warehouse) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa kho này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: WarehouseFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Warehouse> = [
    {
      title: "Mã kho",
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
    },
    {
      title: "Tên kho",
      dataIndex: "warehouseName",
      key: "warehouseName",
      width: 220,
    },
    {
      title: "Loại kho",
      dataIndex: "warehouseType",
      key: "warehouseType",
      width: 160,
      render: (val: Warehouse["warehouseType"]) => (
        <Tag color={val === "NVL" ? "purple" : val === "THANH_PHAM" ? "green" : "blue"}>
          {val === "NVL" ? "NVL" : val === "THANH_PHAM" ? "Thành phẩm" : "Hỗn hợp"}
        </Tag>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
    },
    { title: "Địa chỉ", dataIndex: "address", key: "address" },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) => (
        <Tag color={v ? "success" : "error"}>{v ? "Hoạt động" : "Khóa"}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Warehouse) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            onClick: () => handleView(record),
            icon: <EyeOutlined />,
          },
        ];
        if (can("admin.warehouses", "edit"))
          menuItems.push({
            key: "edit",
            label: "Sửa",
            onClick: () => handleEdit(record),
            icon: <EditOutlined />,
          });
        if (can("admin.warehouses", "delete"))
          menuItems.push({
            key: "delete",
            label: "Xóa",
            onClick: () => handleDelete(record.id),
            icon: <DeleteOutlined />,
          });

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<Warehouse>
        isNotAccessible={!can("admin.warehouses", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["warehouses"],
          buttonEnds: can("admin.warehouses", "create")
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
                  onClick: () => {},
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
            placeholder: "Tìm kiếm kho",
            filterKeys: [
              "warehouseName",
              "warehouseCode",
              "branchName",
              "address",
              "warehouseType",
            ],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: true },
                  { label: "Khóa", value: false },
                ],
              },
              {
                type: "select",
                name: "warehouseType",
                label: "Loại kho",
                options: WarehouseOptions,
              },
              {
                type: "select",
                name: "branchId",
                label: "Chi nhánh",
                options: branches.map((b) => ({
                  label: b.branchName,
                  value: b.id,
                })),
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (c) => updateColumns(c),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          columns={getVisibleColumns()}
          dataSource={filtered}
          loading={isLoading || isFetching || deleteMutation.isPending}
          paging
          rank
          onRowClick={handleView}
        />
      </WrapperContent>

      <Drawer
        size={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Chi tiết kho"
      >
        {selected ? (
          <div className="space-y-4">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Mã kho">
                {selected.warehouseCode}
              </Descriptions.Item>
              <Descriptions.Item label="Tên kho">
                {selected.warehouseName}
              </Descriptions.Item>
              <Descriptions.Item label="Chi nhánh">
                {selected.branchName}
              </Descriptions.Item>
              <Descriptions.Item label="Loại kho">
                {selected.warehouseType}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {selected.address || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selected.isActive ? "Hoạt động" : "Khóa"}
              </Descriptions.Item>
            </Descriptions>

            <div className="flex justify-end gap-2">
              {can("admin.warehouses", "edit") && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDrawerOpen(false);
                    handleEdit(selected);
                  }}
                >
                  Sửa
                </Button>
              )}
              {can("admin.warehouses", "delete") && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setDrawerOpen(false);
                    handleDelete(selected.id);
                  }}
                >
                  Xóa
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo kho" : "Sửa kho"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <WarehouseForm
          mode={modalMode}
          initialValues={
            selected
              ? {
                  warehouseCode: selected.warehouseCode,
                  warehouseName: selected.warehouseName,
                  branchId: selected.branchId,
                  address: selected.address,
                  warehouseType: selected.warehouseType,
                  isActive: selected.isActive,
                }
              : {
                  warehouseType: WarehouseType.THANH_PHAM,
                  isActive: true,
                }
          }
          branches={branches}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}
