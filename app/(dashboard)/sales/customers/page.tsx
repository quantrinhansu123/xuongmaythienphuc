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
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { Customer } from "@/services/customerService";
import { formatCurrency } from "@/utils/format";
import {
  DownloadOutlined,
  LockOutlined,
  PlusOutlined,
  UnlockOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Select, Tag } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();

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
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);

  // File export hook
  const exportColumns = [
    { title: "Mã KH", dataIndex: "customerCode", key: "customerCode" },
    { title: "Tên khách hàng", dataIndex: "customerName", key: "customerName" },
    { title: "Điện thoại", dataIndex: "phone", key: "phone" },
    { title: "Địa chỉ", dataIndex: "address", key: "address" },
    { title: "Nhóm KH", dataIndex: "groupName", key: "groupName" },
    { title: "Công nợ", dataIndex: "debtAmount", key: "debtAmount" },
    { title: "Trạng thái", dataIndex: "isActive", key: "isActive" },
  ];
  const { exportToXlsx } = useFileExport(exportColumns);
  const { openFileDialog } = useFileImport();

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

  const handleBulkDelete = async (ids: React.Key[]) => {
    for (const id of ids) {
      await new Promise<void>((resolve, reject) => {
        deleteMutation.mutate(Number(id), {
          onSuccess: () => resolve(),
          onError: (error: Error) => reject(error),
        });
      });
    }
    message.success(`Đã xóa ${ids.length} khách hàng`);
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
    // Xuất với giá trị thô để có thể nhập lại
    const dataToExport = filteredData.map(customer => ({
      customerCode: customer.customerCode || '',
      customerName: customer.customerName,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      groupName: customer.groupName || '',
      debtAmount: customer.debtAmount || 0,
      isActive: customer.isActive ? 'Có' : 'Không',
    }));
    exportToXlsx(dataToExport, "khach_hang");
  };

  const handleImportExcel = () => {
    openFileDialog(
      async (data: any[]) => {
        try {
          const validCustomers = data.filter((row: any) => {
            const customerName = row['customerName'] || row['Tên khách hàng'];
            return customerName;
          });

          if (validCustomers.length === 0) {
            message.error('Không có dữ liệu hợp lệ trong file Excel');
            return;
          }

          const customers = validCustomers.map((row: any) => {
            const isActive = row['isActive'] || row['Trạng thái'];

            return {
              customerCode: row['customerCode'] || row['Mã KH'] || undefined,
              customerName: row['customerName'] || row['Tên khách hàng'],
              phone: row['phone'] || row['Điện thoại'] || undefined,
              email: row['email'] || row['Email'] || undefined,
              address: row['address'] || row['Địa chỉ'] || undefined,
              isActive: isActive === 'Có' || isActive === 'TRUE' || isActive === true || isActive === undefined,
            };
          });

          message.loading({ content: `Đang import ${customers.length} khách hàng...`, key: 'import' });

          let successCount = 0;
          let errorCount = 0;

          for (const customer of customers) {
            try {
              const res = await fetch('/api/sales/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customer),
              });

              const result = await res.json();
              if (result.success) {
                successCount++;
              } else {
                errorCount++;
                console.error(`Lỗi import ${customer.customerName}:`, result.error);
              }
            } catch (error) {
              errorCount++;
              console.error(`Lỗi import ${customer.customerName}:`, error);
            }
          }

          message.success({
            content: `Import thành công ${successCount}/${customers.length} khách hàng${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
            key: 'import',
            duration: 3
          });

          queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
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

  // Apply client-side filtering
  const filteredCustomers = applyFilter(customers);

  // Column definitions
  const defaultColumns: TableColumnsType<Customer> = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
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
    {
      title: "Công nợ",
      dataIndex: "debtAmount",
      key: "debtAmount",
      width: 130,
      align: "right" as const,
      render: (amount: number) => (
        <span className={(amount || 0) > 0 ? "text-red-600 font-semibold" : "text-gray-400"}>
          {formatCurrency(amount || 0)}
        </span>
      ),
    },
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
          customToolbar: (
            <div className="flex gap-2 items-center flex-wrap">
              <Select
                placeholder="Nhóm khách hàng"
                allowClear
                style={{ width: 200 }}
                value={query.customerGroupId?.toString()}
                onChange={(value) => updateQueries([{ key: "customerGroupId", value: value || "" }])}
                options={groups.map((g) => ({
                  label: g.groupName,
                  value: g.id.toString(),
                }))}
              />
              <Select
                placeholder="Trạng thái"
                allowClear
                style={{ width: 150 }}
                value={query.isActive}
                onChange={(value) => updateQueries([{ key: "isActive", value: value || "" }])}
                options={[
                  { label: "Hoạt động", value: "true" },
                  { label: "Ngừng", value: "false" },
                ]}
              />
            </div>
          ),
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
          columns={getVisibleColumns()}
          dataSource={filteredCustomers}
          loading={customersLoading || customersFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
          paging={true}
          rank={true}
          onRowClick={(record: Customer) => router.push(`/sales/customers/${record.id}`)}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds,
          }}
          onBulkDelete={handleBulkDelete}
          bulkDeleteConfig={{
            confirmTitle: "Xác nhận xóa khách hàng",
            confirmMessage: "Bạn có chắc muốn xóa {count} khách hàng đã chọn?"
          }}
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
