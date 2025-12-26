"use client";

import CommonTable from "@/components/CommonTable";
import CustomerFormModal, {
  type CustomerFormValues,
} from "@/components/customers/CustomerFormModal";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import {
  CUSTOMER_KEYS,
  useCreateCustomer,
  useCustomerGroups,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/hooks/useCustomerQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { Customer } from "@/services/customerService";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  UnlockOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions, Tag } from "antd";
import { useState } from "react";

export default function CustomersPage() {
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
    data: customers = [],
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useCustomers();
  const { data: groups = [] } = useCustomerGroups();
  const deleteMutation = useDeleteCustomer();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // File export hook
  const { exportToXlsx } = useFileExport([]);

  // Event handlers
  const handleCreate = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa khách hàng này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id, {

          onError: (error: Error) => {
            message.error({
              content: error.message || "Có lỗi xảy ra khi xóa khách hàng",
            });
          },
        });
      },
    });
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate(
        { id: editingCustomer.id, data: values },
        {
          onSuccess: () => {
            setShowModal(false);
            setEditingCustomer(null);
          },
          onError: (error: Error) => {
            message.error({
              content: error.message || "Có lỗi xảy ra khi cập nhật khách hàng",
            });
          },
        }
      );
    } else {
      createMutation.mutate(values as Parameters<typeof createMutation.mutate>[0], {
        onSuccess: () => {
          setShowModal(false);
          setEditingCustomer(null);
        },
        onError: (error: Error) => {
          message.error({
            content: error.message || "Có lỗi xảy ra khi thêm khách hàng",
          });
        },
      });
    }
  };

  const handleExportExcel = () => {
    const filteredData = applyFilter(customers);
    exportToXlsx(filteredData, "khach_hang");
  };

  const handleImportExcel = () => {
    modal.info({
      title: "Nhập Excel",
      content: "Tính năng nhập Excel đang được phát triển",
    });
  };

  // Apply client-side filtering
  const filteredCustomers = applyFilter(customers);

  // Column definitions
  const defaultColumns: TableColumnsType<Customer> = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
      fixed: "left",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
    },
    {
      title: "Điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 200,
    },
    {
      title: "Nhóm KH",
      dataIndex: "groupName",
      key: "groupName",
      width: 150,
    },
    // {
    //   title: "Công nợ",
    //   dataIndex: "debtAmount",
    //   key: "debtAmount",
    //   width: 130,
    //   align: "right",
    //   render: (amount: number) => (
    //     <span className={(amount || 0) > 0 ? "text-red-600 font-semibold" : ""}>
    //       {(amount || 0).toLocaleString()} đ
    //     </span>
    //   ),
    // },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <UnlockOutlined /> : <LockOutlined />}
        >
          {isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
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
      <WrapperContent<Customer>
        title="Khách hàng"
        isNotAccessible={!can("sales.customers", "view")}
        isLoading={customersLoading}
        isRefetching={customersFetching}
        isEmpty={!customers?.length}
        header={{
          buttonBackTo: "/dashboard",
          refetchDataWithKeys: CUSTOMER_KEYS.all,
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
            placeholder: "Tìm kiếm khách hàng",
            filterKeys: ["customerName", "customerCode", "phone", "email"],
            suggestions: {
              apiEndpoint: "/api/sales/customers",
              labelKey: "customerName",
              valueKey: "customerCode",
              descriptionKey: "phone",
            },
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "customerGroupId",
                label: "Nhóm khách hàng",
                options: groups.map((g) => ({
                  label: g.groupName,
                  value: g.id.toString(),
                })),
              },
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Ngừng", value: "false" },
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
          DrawerDetails={({ data, onClose }) => (
            <>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Mã khách hàng">
                  <span className="font-mono">{data.customerCode}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Tên khách hàng">
                  <span className="font-medium">{data.customerName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Điện thoại">
                  {data.phone || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {data.email || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {data.address || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Nhóm khách hàng">
                  {data.groupName || "-"}
                </Descriptions.Item>
                {/* <Descriptions.Item label="Công nợ">
                  <span
                    className={
                      (data.debtAmount || 0) > 0 ? "text-red-600 font-semibold" : ""
                    }
                  >
                    {(data.debtAmount || 0).toLocaleString()} đ
                  </span>
                </Descriptions.Item> */}
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={data.isActive ? "success" : "error"}
                    icon={data.isActive ? <UnlockOutlined /> : <LockOutlined />}
                  >
                    {data.isActive ? "Hoạt động" : "Ngừng"}
                  </Tag>
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
          columns={getVisibleColumns()}
          dataSource={filteredCustomers}
          loading={customersLoading || customersFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
          paging={true}
          rank={true}
        />
      </WrapperContent>

      <CustomerFormModal
        open={showModal}
        mode={editingCustomer ? "edit" : "create"}
        customer={editingCustomer}
        groups={groups}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
