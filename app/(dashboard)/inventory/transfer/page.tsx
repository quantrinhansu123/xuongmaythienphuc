"use client";

import CommonTable from "@/components/CommonTable";
import TransferForm from "@/components/inventory/TransferForm";
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

type TransferTransaction = {
  id: number;
  transactionCode: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
  toWarehouseId: number;
  toWarehouseName: string;
  status: "PENDING" | "APPROVED" | "COMPLETED";
  totalAmount: number;
  notes?: string;
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
    useState<TransferTransaction | null>(null);
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
    data: transfers = [],
    isLoading,
    isFetching,
  } = useQuery<TransferTransaction[]>({
    queryKey: ["inventory", "transfer", selectedWarehouseId],
    enabled: !!selectedWarehouseId,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/transfer?warehouseId=${selectedWarehouseId}`
      );
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/transfer/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", "transfer", selectedWarehouseId],
      });
    },
  });

  const columnsAll: TableColumnsType<TransferTransaction> = [
    {
      title: "Mã phiếu",
      dataIndex: "transactionCode",
      key: "transactionCode",
      width: 140,
    },
    {
      title: "Kho xuất",
      dataIndex: "fromWarehouseName",
      key: "fromWarehouseName",
      width: 180,
    },
    {
      title: "Kho nhập",
      dataIndex: "toWarehouseName",
      key: "toWarehouseName",
      width: 180,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
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
      render: (_: unknown, record: TransferTransaction) => (
        <div className="flex gap-2">
          {record.status === "PENDING" && can("inventory.transfer", "edit") && (
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
  };

  const { data: transactionDetails = [] } = useQuery<TransactionDetail[]>({
    queryKey: ["inventory", "transfer", "details", selectedTransaction?.id],
    enabled: !!selectedTransaction?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/transfer/${selectedTransaction?.id}`
      );
      const body = await res.json();
      return body.success ? body.data?.details || [] : [];
    },
  });

  const handleView = (record: TransferTransaction) => {
    setSelectedTransaction(record);
    setDrawerOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/inventory/transfer/${id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success("Duyệt phiếu thành công");
        queryClient.invalidateQueries({
          queryKey: ["inventory", "transfer", selectedWarehouseId],
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

  const filtered = applyFilter<TransferTransaction>(transfers);

  const handleExportExcel = () => {
    exportToXlsx(filtered, 'phieu-luan-chuyen-kho');
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

  if (!can("inventory.transfer", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  return (
    <>
      <WrapperContent<TransferTransaction>
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: selectedWarehouseId
            ? ["inventory", "transfer", String(selectedWarehouseId)]
            : ["inventory", "transfer"],
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
            ...(can("inventory.transfer", "create") ? [{
              type: 'primary' as const,
              name: 'Tạo phiếu luân chuyển',
              onClick: () => setCreateModalOpen(true),
              icon: <PlusOutlined />,
            }] : []),
          ],
          searchInput: {
            placeholder: "Tìm kiếm phiếu luân chuyển",
            filterKeys: [
              "transactionCode",
              "fromWarehouseName",
              "toWarehouseName",
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
        title="Chi tiết phiếu luân chuyển kho"
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
              <Descriptions.Item label="Kho xuất">
                {selectedTransaction.fromWarehouseName}
              </Descriptions.Item>
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
                  window.open(`/api/inventory/transfer/${selectedTransaction.id}/pdf`, "_blank")
                }
              >
                In phiếu
              </Button>
              {selectedTransaction.status === "PENDING" &&
                can("inventory.transfer", "edit") && (
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
                    <th className="px-4 py-2 text-right border">Đơn giá</th>
                    <th className="px-4 py-2 text-right border">Thành tiền</th>
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
                      <td className="px-4 py-2 border text-right">
                        {formatCurrency(detail.unitPrice, "")}
                      </td>
                      <td className="px-4 py-2 border text-right font-semibold">
                        {formatCurrency(detail.totalAmount, "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-4 py-2 border text-right">
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
        title="Tạo phiếu luân chuyển kho"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {selectedWarehouseId && (
          <TransferForm
            fromWarehouseId={selectedWarehouseId}
            onSuccess={() => {
              setCreateModalOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["inventory", "transfer", selectedWarehouseId],
              });
            }}
            onCancel={() => setCreateModalOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
