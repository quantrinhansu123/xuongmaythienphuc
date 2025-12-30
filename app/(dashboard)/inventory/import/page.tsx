"use client";

import CommonTable from "@/components/CommonTable";
import EditImportForm from "@/components/inventory/EditImportForm";
import ImportForm from "@/components/inventory/ImportForm";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatQuantity } from "@/utils/format";
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Modal,
  Select,
  Tag,
  message
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const { RangePicker } = DatePicker;

type ImportTransaction = {
  id: number;
  transactionCode: string;
  toWarehouseId: number;
  toWarehouseName: string;
  status: "PENDING" | "APPROVED" | "COMPLETED";
  totalAmount: number;
  notes?: string;
  relatedOrderCode?: string;
  relatedCustomerName?: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
};

type Warehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName?: string;
};

export default function Page() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query, pagination, handlePageChange } = useFilter();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ImportTransaction | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ImportTransaction | null>(null);

  // Lấy danh sách kho
  const { data: warehousesData = [] } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Tự động chọn kho đầu tiên
  useEffect(() => {
    if (warehousesData.length > 0 && selectedWarehouseId === null) {
      setSelectedWarehouseId(warehousesData[0].id);
    }
  }, [warehousesData, selectedWarehouseId]);

  const {
    data: imports = [],
    isLoading,
    isFetching,
  } = useQuery<ImportTransaction[]>({
    queryKey: ["inventory", "import", selectedWarehouseId, query],
    enabled: selectedWarehouseId !== null,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWarehouseId !== null) params.append("warehouseId", String(selectedWarehouseId));
      if (query.status) params.append("status", String(query.status));
      if (query.startDate) params.append("startDate", String(query.startDate));
      if (query.endDate) params.append("endDate", String(query.endDate));

      const res = await fetch(`/api/inventory/import?${params.toString()}`);
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/import/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", "import", selectedWarehouseId],
      });
    },
  });

  const columnsAll: TableColumnsType<ImportTransaction> = [
    {
      title: "Mã phiếu",
      dataIndex: "transactionCode",
      key: "transactionCode",
      width: 140,
    },
    {
      title: "Đơn hàng",
      key: "orderInfo",
      width: 180,
      render: (_: unknown, record: ImportTransaction) => (
        record.relatedOrderCode ? (
          <div>
            <div className="font-medium">{record.relatedOrderCode}</div>
            <div className="text-xs text-gray-500">{record.relatedCustomerName}</div>
          </div>
        ) : <span className="text-gray-400">-</span>
      ),
    },
    {
      title: "Kho nhập",
      dataIndex: "toWarehouseName",
      key: "toWarehouseName",
      width: 160,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const colors = {
          PENDING: "orange",
          APPROVED: "blue",
          COMPLETED: "green",
        };
        const labels = {
          PENDING: "Chờ duyệt",
          APPROVED: "Đã duyệt",
          COMPLETED: "Hoàn thành",
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      },
    },
    {
      title: "Người tạo",
      dataIndex: "createdByName",
      key: "createdByName",
      width: 160,
    },
    {
      title: "Người duyệt",
      dataIndex: "approvedByName",
      key: "approvedByName",
      width: 160,
      render: (val: string) => val || "-",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (val: string) => new Date(val).toLocaleString("vi-VN"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_: unknown, record: ImportTransaction) => (
        <div className="flex gap-2">
          {record.status === "PENDING" && can("inventory.import", "edit") && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(record);
                }}
              >
                Sửa
              </Button>
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(record.id);
                }}
              >
                Duyệt
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  type TransactionDetail = {
    id: number;
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalAmount?: number;
    notes?: string;
  };

  const { data: transactionDetails = [] } = useQuery<TransactionDetail[]>({
    queryKey: ["inventory", "import", "details", selectedTransaction?.id],
    enabled: !!selectedTransaction?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/import/${selectedTransaction?.id}`
      );
      const body = await res.json();
      return body.success ? body.data?.details || [] : [];
    },
  });

  const handleView = (record: ImportTransaction) => {
    setSelectedTransaction(record);
    setDrawerOpen(true);
  };

  // Lấy chi tiết phiếu để edit
  const { data: editTransactionData } = useQuery({
    queryKey: ["inventory", "import", "edit", editingTransaction?.id],
    enabled: !!editingTransaction?.id,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/import/${editingTransaction?.id}`);
      const body = await res.json();
      return body.success ? body.data : null;
    },
  });

  const handleEdit = (record: ImportTransaction) => {
    setEditingTransaction(record);
    setEditModalOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/import/${id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Duyệt phiếu thành công");
        queryClient.invalidateQueries({
          queryKey: ["inventory", "import", selectedWarehouseId],
        });
        setDrawerOpen(false);
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    },
  });

  const handleApprove = (id: number) => {
    modal.confirm({
      title: "Xác nhận duyệt phiếu",
      content: "Sau khi duyệt, tồn kho sẽ được cập nhật. Bạn có chắc chắn?",
      okText: "Duyệt",
      cancelText: "Hủy",
      onOk: () => approveMutation.mutate(id),
    });
  };

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  // Define export columns explicitly
  const exportColumns = [
    { title: "Mã phiếu", dataIndex: "transactionCode", key: "transactionCode" },
    { title: "Đơn hàng", dataIndex: "relatedOrderCode", key: "relatedOrderCode" },
    { title: "Khách hàng", dataIndex: "relatedCustomerName", key: "relatedCustomerName" },
    { title: "Kho nhập", dataIndex: "toWarehouseName", key: "toWarehouseName" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
    { title: "Người tạo", dataIndex: "createdByName", key: "createdByName" },
    { title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt" },
  ];

  const { exportToXlsx } = useFileExport(exportColumns);
  const { openFileDialog } = useFileImport();

  const filtered = applyFilter<ImportTransaction>(imports, ['startDate', 'endDate']);

  const handleExportExcel = () => {
    const statusLabels: Record<string, string> = {
      PENDING: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      COMPLETED: "Hoàn thành",
    };

    const dataToExport = filtered.map(item => ({
      ...item,
      status: statusLabels[item.status] || item.status,
      createdAt: new Date(item.createdAt).toLocaleString("vi-VN"),
      relatedOrderCode: item.relatedOrderCode || '',
      relatedCustomerName: item.relatedCustomerName || '',
    }));
    exportToXlsx(dataToExport, 'phieu-nhap-kho');
  };

  const handleImportExcel = () => {
    openFileDialog(
      (data) => {
        console.log('Imported data:', data);
        // TODO: Xử lý dữ liệu import và gọi API
        alert(`Đã đọc ${data.length} dòng. Chức năng xử lý dữ liệu đang được phát triển.`);
      },
      (error) => {
        console.error('Import error:', error);
      }
    );
  };

  if (!can("inventory.import", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <>
      <WrapperContent<ImportTransaction>
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: selectedWarehouseId
            ? ["inventory", "import", String(selectedWarehouseId)]
            : ["inventory", "import"],
          customToolbar: (
            <div className="flex gap-2">
              <Select
                style={{ width: 250 }}
                placeholder="Chọn kho"
                value={selectedWarehouseId}
                onChange={(value) => setSelectedWarehouseId(value)}
                showSearch
                optionFilterProp="label"
                options={[
                  ...(can('inventory.import', 'view') ? [{ label: 'Toàn hệ thống', value: 0 }] : []),
                  ...warehousesData.map((w) => ({
                    label: `${w.warehouseName} (${w.branchName || ''})`,
                    value: w.id,
                  }))
                ]}
              />
              <Select
                style={{ width: 150 }}
                placeholder="Trạng thái"
                allowClear
                value={query.status}
                onChange={(val) => updateQueries([{ key: "status", value: val }])}
                options={[
                  { label: "Chờ duyệt", value: "PENDING" },
                  { label: "Đã duyệt", value: "APPROVED" },
                  { label: "Hoàn thành", value: "COMPLETED" },
                ]}
              />
            </div>
          ),
          customToolbarSecondRow: (
            <div className="flex gap-2 items-center">
              <RangePicker
                placeholder={["Từ ngày", "Đến ngày"]}
                style={{ width: 260 }}
                presets={[
                  { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                  { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                  { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                  { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                ]}
                value={
                  query.startDate && query.endDate
                    ? [dayjs(query.startDate as string), dayjs(query.endDate as string)]
                    : null
                }
                onChange={(dates) => {
                  if (dates) {
                    updateQueries([
                      { key: "startDate", value: dates[0]?.format('YYYY-MM-DD') },
                      { key: "endDate", value: dates[1]?.format('YYYY-MM-DD') },
                    ]);
                  } else {
                    updateQueries([
                      { key: "startDate", value: "" },
                      { key: "endDate", value: "" },
                    ]);
                  }
                }}
              />
            </div>
          ),
          buttonEnds: [
            {
              type: 'default',
              name: 'Nhập Excel',
              onClick: handleImportExcel,
              icon: <UploadOutlined />,
            },
            {
              type: 'default',
              name: 'Xuất Excel',
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
            ...(can("inventory.import", "create") ? [{
              type: 'primary' as const,
              name: 'Tạo phiếu nhập',
              onClick: () => setCreateModalOpen(true),
              icon: <PlusOutlined />,
            }] : []),
          ],
          searchInput: {
            placeholder: "Tìm kiếm phiếu nhập",
            filterKeys: ["transactionCode", "toWarehouseName", "createdByName"],
          },
          filters: {
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
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
          pagination={{ ...pagination, onChange: handlePageChange }}
          onRowClick={handleView}
        />
      </WrapperContent >

      <Drawer
        title="Chi tiết phiếu nhập kho"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="large"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã phiếu" span={2}>
                {selectedTransaction.transactionCode}
              </Descriptions.Item>
              {selectedTransaction.relatedOrderCode && (
                <>
                  <Descriptions.Item label="Đơn hàng">
                    <span className="font-medium text-blue-600">{selectedTransaction.relatedOrderCode}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Khách hàng">
                    {selectedTransaction.relatedCustomerName}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Kho nhập">
                {selectedTransaction.toWarehouseName}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag
                  color={
                    selectedTransaction.status === "PENDING"
                      ? "orange"
                      : selectedTransaction.status === "APPROVED"
                        ? "blue"
                        : "green"
                  }
                >
                  {selectedTransaction.status === "PENDING"
                    ? "Chờ duyệt"
                    : selectedTransaction.status === "APPROVED"
                      ? "Đã duyệt"
                      : "Hoàn thành"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Người tạo">
                {selectedTransaction.createdByName}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(selectedTransaction.createdAt).toLocaleString(
                  "vi-VN"
                )}
              </Descriptions.Item>
              {selectedTransaction.approvedByName && (
                <>
                  <Descriptions.Item label="Người duyệt">
                    {selectedTransaction.approvedByName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày duyệt">
                    {selectedTransaction.approvedAt
                      ? new Date(selectedTransaction.approvedAt).toLocaleString(
                        "vi-VN"
                      )
                      : "-"}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedTransaction.notes || "-"}
              </Descriptions.Item>
            </Descriptions>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                icon={<DownloadOutlined />}
                onClick={() =>
                  window.open(`/api/inventory/import/${selectedTransaction.id}/pdf`, "_blank", "noopener,noreferrer")
                }
              >
                In phiếu
              </Button>
              {selectedTransaction.status === "PENDING" &&
                can("inventory.import", "edit") && (
                  <Button
                    type="primary"
                    onClick={() => handleApprove(selectedTransaction.id)}
                    loading={approveMutation.isPending}
                  >
                    Duyệt phiếu
                  </Button>
                )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Chi tiết hàng hóa</h3>
              <table className="w-full border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left border">Mã</th>
                    <th className="px-4 py-2 text-left border">Tên</th>
                    <th className="px-4 py-2 text-right border">Số lượng</th>
                    <th className="px-4 py-2 text-left border">ĐVT</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionDetails.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border font-mono text-sm">
                        {detail.itemCode}
                      </td>
                      <td className="px-4 py-2 border">{detail.itemName}</td>
                      <td className="px-4 py-2 border text-right">
                        {formatQuantity(detail.quantity)}
                      </td>
                      <td className="px-4 py-2 border">{detail.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="Tạo phiếu nhập kho"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {selectedWarehouseId && (
          <ImportForm
            warehouseId={selectedWarehouseId}
            onSuccess={() => {
              setCreateModalOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["inventory", "import", selectedWarehouseId],
              });
            }}
            onCancel={() => setCreateModalOpen(false)}
          />
        )}
      </Modal>

      <Modal
        title="Sửa phiếu nhập kho"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {editingTransaction && editTransactionData && (
          <EditImportForm
            transactionId={editingTransaction.id}
            warehouseId={editingTransaction.toWarehouseId}
            initialData={{
              notes: editTransactionData.notes,
              details: editTransactionData.details,
            }}
            onSuccess={() => {
              setEditModalOpen(false);
              setEditingTransaction(null);
              queryClient.invalidateQueries({
                queryKey: ["inventory", "import"],
              });
            }}
            onCancel={() => {
              setEditModalOpen(false);
              setEditingTransaction(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
