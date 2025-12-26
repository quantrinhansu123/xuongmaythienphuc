"use client";

import CommonTable from "@/components/CommonTable";
import ExportForm from "@/components/inventory/ExportForm";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatQuantity } from "@/utils/format";
import {
    DownloadOutlined,
    PlusOutlined,
    UploadOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
    App,
    Button,
    Descriptions,
    Drawer,
    Modal,
    Select,
    Tag,
    message,
} from "antd";
import { useEffect, useState } from "react";

type ExportTransaction = {
  id: number;
  transactionCode: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
  status: "PENDING" | "APPROVED" | "COMPLETED";
  totalAmount: number;
  notes?: string;
  relatedOrderCode?: string;
  relatedCustomerName?: string;
  hasInsufficientStock?: boolean;
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
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ExportTransaction | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
    if (warehousesData.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehousesData[0].id);
    }
  }, [warehousesData, selectedWarehouseId]);

  const {
    data: exports = [],
    isLoading,
    isFetching,
  } = useQuery<ExportTransaction[]>({
    queryKey: ["inventory", "export", selectedWarehouseId],
    enabled: !!selectedWarehouseId,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/export?warehouseId=${selectedWarehouseId}`
      );
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/export/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", "export", selectedWarehouseId],
      });
    },
  });

  const columnsAll: TableColumnsType<ExportTransaction> = [
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
      render: (_: unknown, record: ExportTransaction) => (
        record.relatedOrderCode ? (
          <div>
            <div className="font-medium">{record.relatedOrderCode}</div>
            <div className="text-xs text-gray-500">{record.relatedCustomerName}</div>
          </div>
        ) : <span className="text-gray-400">-</span>
      ),
    },
    {
      title: "Kho xuất",
      dataIndex: "fromWarehouseName",
      key: "fromWarehouseName",
      width: 160,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: string, record: ExportTransaction) => {
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
          <div className="flex items-center gap-2">
            <Tag color={colors[status as keyof typeof colors]}>
              {labels[status as keyof typeof labels]}
            </Tag>
            {status === "PENDING" && record.hasInsufficientStock && (
              <Tag color="red">⚠️ Thiếu tồn</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right",
      render: (val: number) => formatCurrency(val, ""),
    },
    {
      title: "Người tạo",
      dataIndex: "createdByName",
      key: "createdByName",
      width: 160,
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
      width: 120,
      fixed: "right",
      render: (_: unknown, record: ExportTransaction) => (
        <div className="flex gap-2">
          {record.status === "PENDING" && can("inventory.export", "edit") && (
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
    stockQuantity?: number;
  };

  const { data: transactionDetails = [] } = useQuery<TransactionDetail[]>({
    queryKey: ["inventory", "export", "details", selectedTransaction?.id],
    enabled: !!selectedTransaction?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/export/${selectedTransaction?.id}`
      );
      const body = await res.json();
      return body.success ? body.data?.details || [] : [];
    },
  });

  const handleView = (record: ExportTransaction) => {
    setSelectedTransaction(record);
    setDrawerOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/export/${id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Duyệt phiếu thành công");
        queryClient.invalidateQueries({
          queryKey: ["inventory", "export", selectedWarehouseId],
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

  const { exportToXlsx } = useFileExport(columnsAll);
  const { openFileDialog } = useFileImport();

  const filtered = applyFilter<ExportTransaction>(exports);

  const handleExportExcel = () => {
    exportToXlsx(filtered, 'phieu-xuat-kho');
  };

  const handleImportExcel = () => {
    openFileDialog(
      (data) => {
        console.log('Imported data:', data);
        alert(`Đã đọc ${data.length} dòng. Chức năng xử lý dữ liệu đang được phát triển.`);
      },
      (error) => {
        console.error('Import error:', error);
      }
    );
  };

  if (!can("inventory.export", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <>
      <WrapperContent<ExportTransaction>
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: selectedWarehouseId
            ? ["inventory", "export", String(selectedWarehouseId)]
            : ["inventory", "export"],
          customToolbar: (
            <Select
              style={{ width: 200 }}
              placeholder="Chọn kho"
              value={selectedWarehouseId}
              onChange={(value) => setSelectedWarehouseId(value)}
              options={warehousesData.map((w) => ({
                label: `${w.warehouseName} (${w.branchName || ""})`,
                value: w.id,
              }))}
            />
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
            ...(can("inventory.export", "create") ? [{
              type: 'primary' as const,
              name: 'Tạo phiếu xuất',
              onClick: () => setCreateModalOpen(true),
              icon: <PlusOutlined />,
            }] : []),
          ],
          searchInput: {
            placeholder: "Tìm kiếm phiếu xuất",
            filterKeys: [
              "transactionCode",
              "fromWarehouseName",
              "createdByName",
            ],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "status",
                label: "Trạng thái",
                options: [
                  { label: "Chờ duyệt", value: "PENDING" },
                  { label: "Đã duyệt", value: "APPROVED" },
                  { label: "Hoàn thành", value: "COMPLETED" },
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
          dataSource={filtered}
          loading={isLoading || isFetching || deleteMutation.isPending}
          paging
          rank
          onRowClick={handleView}
        />
      </WrapperContent>

      <Drawer
        title="Chi tiết phiếu xuất kho"
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
              <Descriptions.Item label="Kho xuất">
                {selectedTransaction.fromWarehouseName}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <div className="flex items-center gap-2">
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
                  {selectedTransaction.status === "PENDING" && selectedTransaction.hasInsufficientStock && (
                    <Tag color="red">⚠️ Tồn kho không đủ</Tag>
                  )}
                </div>
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
                  window.open(`/api/inventory/export/${selectedTransaction.id}/pdf`, "_blank")
                }
              >
                In phiếu
              </Button>
              {selectedTransaction.status === "PENDING" &&
                can("inventory.export", "edit") && (
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
                    <th className="px-4 py-2 text-right border">Yêu cầu</th>
                    <th className="px-4 py-2 text-right border">Tồn kho</th>
                    <th className="px-4 py-2 text-left border">ĐVT</th>
                    <th className="px-4 py-2 text-right border">Đơn giá</th>
                    <th className="px-4 py-2 text-right border">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionDetails.map((detail) => {
                    const isInsufficient = (detail.stockQuantity || 0) < detail.quantity;
                    return (
                      <tr key={detail.id} className={`hover:bg-gray-50 ${isInsufficient ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2 border font-mono text-sm">
                          {detail.itemCode}
                        </td>
                        <td className="px-4 py-2 border">{detail.itemName}</td>
                        <td className="px-4 py-2 border text-right">
                          {formatQuantity(detail.quantity)}
                        </td>
                        <td className={`px-4 py-2 border text-right ${isInsufficient ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                          {formatQuantity(detail.stockQuantity || 0)}
                          {isInsufficient && <span className="ml-1">⚠️</span>}
                        </td>
                        <td className="px-4 py-2 border">{detail.unit}</td>
                        <td className="px-4 py-2 border text-right">
                          {formatCurrency(detail.unitPrice, "")}
                        </td>
                        <td className="px-4 py-2 border text-right font-semibold">
                          {formatCurrency(detail.totalAmount, "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={6} className="px-4 py-2 border text-right">
                      Tổng cộng:
                    </td>
                    <td className="px-4 py-2 border text-right">
                      {formatCurrency(transactionDetails.reduce((sum, d) => sum + (d.totalAmount || 0), 0), "")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="Tạo phiếu xuất kho"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {selectedWarehouseId && (
          <ExportForm
            warehouseId={selectedWarehouseId}
            onSuccess={() => {
              setCreateModalOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["inventory", "export", selectedWarehouseId],
              });
            }}
            onCancel={() => setCreateModalOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
