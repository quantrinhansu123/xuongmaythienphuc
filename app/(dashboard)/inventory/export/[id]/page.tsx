"use client";

import CommonTable from "@/components/CommonTable";
import ExportForm from "@/components/inventory/ExportForm";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatQuantity } from "@/utils/format";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions, Drawer, Modal, Tag } from "antd";
import { message } from "antd/lib";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ExportTransaction = {
  id: number;
  transactionCode: string;
  fromWarehouseId: number;
  fromWarehouseName: string;
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

export default function ExportWarehousePage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const warehouseId = params?.id;
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();

  const {
    data: exports = [],
    isLoading,
    isFetching,
  } = useQuery<ExportTransaction[]>({
    queryKey: ["inventory", "export", warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const res = await fetch(
        `/api/inventory/export?warehouseId=${warehouseId}`
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
        queryKey: ["inventory", "export", warehouseId],
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
      title: "Kho xuất",
      dataIndex: "fromWarehouseName",
      key: "fromWarehouseName",
      width: 200,
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
      width: 200,
      fixed: "right",
      render: (_: unknown, record: ExportTransaction) => (
        <div className="flex gap-2">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            Xem
          </Button>
          {record.status === "PENDING" && can("inventory.export", "edit") && (
            <Button
              type="link"
              size="small"
              onClick={() => handleApprove(record.id)}
            >
              Duyệt
            </Button>
          )}
          <Button
            type="link"
            size="small"
            onClick={() =>
              window.open(`/api/inventory/export/${record.id}/pdf`, "_blank")
            }
          >
            In
          </Button>
        </div>
      ),
    },
  ];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ExportTransaction | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
          queryKey: ["inventory", "export", warehouseId],
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

  const filtered = applyFilter<ExportTransaction>(exports);

  if (!can("inventory.export", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  if (!warehouseId) {
    return (
      <div className="p-6">
        <h3>Không tìm thấy warehouseId trong route.</h3>
        <Button onClick={() => router.push("/inventory/export")}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <>
      <WrapperContent<ExportTransaction>
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["inventory", "export", warehouseId],
          buttonEnds: can("inventory.export", "create")
            ? [
                {
                  type: "primary",
                  name: "Tạo phiếu xuất",
                  onClick: () => setCreateModalOpen(true),
                  icon: <PlusOutlined />,
                },
              ]
            : undefined,
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
              <Descriptions.Item label="Kho xuất">
                {selectedTransaction.fromWarehouseName}
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

            {selectedTransaction.status === "PENDING" &&
              can("inventory.export", "edit") && (
                <div className="flex justify-end mt-4">
                  <Button
                    type="primary"
                    onClick={() => handleApprove(selectedTransaction.id)}
                    loading={approveMutation.isPending}
                  >
                    Duyệt phiếu
                  </Button>
                </div>
              )}

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
        title="Tạo phiếu xuất kho"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        <ExportForm
          warehouseId={parseInt(warehouseId)}
          onSuccess={() => {
            setCreateModalOpen(false);
            queryClient.invalidateQueries({
              queryKey: ["inventory", "export", warehouseId],
            });
          }}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>
    </>
  );
}
