"use client";

import CommonTable from "@/components/CommonTable";
import CustomerGroupFormModal, {
  type CustomerGroupFormValues,
} from "@/components/customers/CustomerGroupFormModal";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import {
  CUSTOMER_GROUP_KEYS,
  useCreateCustomerGroup,
  useCustomerGroups,
  useDeleteCustomerGroup,
  useUpdateCustomerGroup,
} from "@/hooks/useCustomerGroupQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { CustomerGroup } from "@/services/customerGroupService";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions } from "antd";
import { useState } from "react";

export default function CustomerGroupsPage() {
  const { can } = usePermissions();
  const { modal, message } = App.useApp();

  // Filter hook
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // React Query hooks
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isFetching: groupsFetching,
  } = useCustomerGroups();
  const deleteMutation = useDeleteCustomerGroup();
  const createMutation = useCreateCustomerGroup();
  const updateMutation = useUpdateCustomerGroup();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);

  // File export hook
  const { exportToXlsx } = useFileExport([]);

  // Event handlers
  const handleCreate = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const handleEdit = (group: CustomerGroup) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa nhóm khách hàng này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id, {
          onSuccess: () => {
            message.success({
              content: "Xóa nhóm khách hàng thành công",
            });
          },
          onError: (error: Error) => {
            modal.error({
              title: "Lỗi",
              content: error.message || "Có lỗi xảy ra khi xóa nhóm khách hàng",
            });
          },
        });
      },
    });
  };

  const handleSubmit = async (values: CustomerGroupFormValues) => {
    if (editingGroup) {
      updateMutation.mutate(
        { id: editingGroup.id, data: values },
        {
          onSuccess: () => {
            message.success({
              content: "Cập nhật nhóm khách hàng thành công",
            });
            setShowModal(false);
            setEditingGroup(null);
          },
          onError: (error: Error) => {
            message.error({
              content:
                error.message || "Có lỗi xảy ra khi cập nhật nhóm khách hàng",
            });
          },
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          message.success({
            content: "Thêm nhóm khách hàng thành công",
          });
          setShowModal(false);
        },
        onError: (error: Error) => {
          message.error({
            content: error.message || "Có lỗi xảy ra khi thêm nhóm khách hàng",
          });
        },
      });
    }
  };

  const handleExportExcel = () => {
    const filteredData = applyFilter(groups);
    exportToXlsx(filteredData, "nhom_khach_hang");
  };

  const handleImportExcel = () => {
    modal.info({
      title: "Nhập Excel",
      content: "Tính năng nhập Excel đang được phát triển",
    });
  };

  // Apply client-side filtering
  const filteredGroups = applyFilter(groups);

  // Column definitions
  const defaultColumns: TableColumnsType<CustomerGroup> = [
    {
      title: "Mã nhóm",
      dataIndex: "groupCode",
      key: "groupCode",
      width: 150,
      fixed: "left",
    },
    {
      title: "Tên nhóm",
      dataIndex: "groupName",
      key: "groupName",
      width: 200,
    },
    {
      title: "Hệ số giá",
      dataIndex: "priceMultiplier",
      key: "priceMultiplier",
      width: 130,
      align: "right",
      render: (value: number) => (
        <span className="font-semibold text-blue-600">{value}%</span>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 300,
      render: (text: string) => text || "-",
    },
    {
      title: "Số khách hàng",
      dataIndex: "customerCount",
      key: "customerCount",
      width: 130,
      align: "right",
      render: (count: number) => (
        <span className="font-medium">{count || 0}</span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          canEdit={can("sales.customers", "edit")}
          canDelete={can("sales.customers", "delete")}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  return (
    <>
      <WrapperContent<CustomerGroup>
        title="Nhóm khách hàng"
        isNotAccessible={!can("sales.customers", "view")}
        isLoading={groupsLoading}
        isRefetching={groupsFetching}
        isEmpty={!groups?.length}
        header={{
          refetchDataWithKeys: CUSTOMER_GROUP_KEYS.all,
          buttonEnds: [
            {
              can: can("sales.customers", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("sales.customers", "view"),
              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
            {
              can: can("sales.customers", "create"),
              type: "default",
              name: "Nhập Excel",
              onClick: handleImportExcel,
              icon: <UploadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm kiếm nhóm khách hàng",
            filterKeys: ["groupName", "groupCode", "description"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "priceMultiplier",
                label: "Hệ số giá",
                options: [
                  { label: "Không giảm (0%)", value: "0" },
                  { label: "Giảm 5%", value: "5" },
                  { label: "Giảm 10%", value: "10" },
                  { label: "Giảm 15%", value: "15" },
                  { label: "Giảm 20%", value: "20" },
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
          columns={getVisibleColumns()}
          dataSource={filteredGroups}
          loading={groupsLoading || groupsFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
          rank={true}
          DrawerDetails={({ data, onClose }) => (
            <>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Mã nhóm">
                  <span className="font-mono">{data.groupCode}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Tên nhóm">
                  <span className="font-medium">{data.groupName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Hệ số giá">
                  <span className="font-semibold text-blue-600">
                    {data.priceMultiplier}%
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {data.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Số khách hàng">
                  <span className="font-semibold">
                    {data.customerCount || 0} khách hàng
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {new Date(data.createdAt).toLocaleString("vi-VN")}
                </Descriptions.Item>
              </Descriptions>
              <div className="flex gap-2 justify-end mt-4">
                {can("sales.customers", "edit") && (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => {
                      onClose();
                      handleEdit(data);
                    }}
                  >
                    Sửa
                  </Button>
                )}
                {can("sales.customers", "delete") && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      onClose();
                      handleDelete(data.id);
                    }}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </>
          )}
        />
      </WrapperContent>

      <CustomerGroupFormModal
        open={showModal}
        mode={editingGroup ? "edit" : "create"}
        group={editingGroup}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
