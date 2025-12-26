"use client";

import BranchDetailDrawer from "@/components/branches/BranchDetailDrawer";
import BranchFormModal, {
    type BranchFormValues,
} from "@/components/branches/BranchFormModal";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { BRANCH_KEYS, useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { Branch } from "@/services/commonService";
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    MoreOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Dropdown, Tag } from "antd";
import { useState } from "react";

export default function BranchesPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();

  const { data: branches = [], isLoading, isFetching } = useBranches();
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: BranchFormValues) =>
      fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCH_KEYS.all }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BranchFormValues }) =>
      fetch(`/api/admin/branches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCH_KEYS.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/branches/${id}`, { method: "DELETE" }).then((r) =>
        r.json()
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCH_KEYS.all }),
  });

  const filtered = applyFilter(branches as Branch[]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();

  const handleView = (b: Branch) => {
    setSelectedBranch(b);
    setDrawerVisible(true);
  };
  const handleCreate = () => {
    setModalMode("create");
    setSelectedBranch(null);
    setModalVisible(true);
  };
  const handleEdit = (b: Branch) => {
    setModalMode("edit");
    setSelectedBranch(b);
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa chi nhánh này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleModalSubmit = (values: BranchFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: () => setModalVisible(false),
      });
    } else if (selectedBranch) {
      updateMutation.mutate(
        { id: selectedBranch.id, data: values },
        { onSuccess: () => setModalVisible(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Branch> = [
    {
      title: "Mã",
      dataIndex: "branchCode",
      key: "branchCode",
      width: 160,
      fixed: "left",
    },
    {
      title: "Tên chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 240,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 240,
      render: (t) => t || "-",
    },
    { title: "Điện thoại", dataIndex: "phone", key: "phone", width: 160 },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_: unknown, record: Branch) => {
        const items = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];
        if (can("admin.branches", "edit"))
          items.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        if (can("admin.branches", "delete"))
          items.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });
        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomLeft">
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const confirmLoading = Boolean(
    (createMutation as unknown as { isPending?: boolean }).isPending ||
      (updateMutation as unknown as { isPending?: boolean }).isPending
  );

  return (
    <>
      <WrapperContent<Branch>
        isNotAccessible={!can("admin.branches", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: BRANCH_KEYS.all,
          buttonEnds: can("admin.branches", "create")
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
            placeholder: "Tìm kiếm chi nhánh",
            filterKeys: ["branchCode", "branchName", "address", "phone"],
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
          dataSource={filtered as Branch[]}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
          onRowClick={handleView}
        />
      </WrapperContent>

      <BranchDetailDrawer
        open={drawerVisible}
        branch={selectedBranch}
        onClose={() => setDrawerVisible(false)}
        onEdit={(b) => {
          setDrawerVisible(false);
          handleEdit(b);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("admin.branches", "edit")}
        canDelete={can("admin.branches", "delete")}
      />

      <BranchFormModal
        open={modalVisible}
        mode={modalMode}
        branch={selectedBranch}
        confirmLoading={confirmLoading}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
