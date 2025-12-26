"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatQuantity } from "@/utils/format";
import { EyeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Button, Descriptions, Drawer, Tag } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type HistoryTransaction = {
  id: number;
  transactionCode: string;
  transactionType: "NHAP" | "XUAT" | "CHUYEN";
  fromWarehouseId?: number;
  fromWarehouseName?: string;
  toWarehouseId?: number;
  toWarehouseName?: string;
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

type TransactionDetail = {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: "NVL" | "THANH_PHAM";
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalAmount?: number;
  notes?: string;
};

export default function TransactionHistoryWarehousePage() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const warehouseId = params?.id;
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<HistoryTransaction | null>(null);

  const {
    data: transactions = [],
    isLoading,
    isFetching,
  } = useQuery<HistoryTransaction[]>({
    queryKey: ["inventory", "history", warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/history?warehouseId=${warehouseId}`);
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const { data: transactionDetails = [] } = useQuery<TransactionDetail[]>({
    queryKey: ["inventory", "history", "details", selectedTransaction?.id],
    enabled: !!selectedTransaction?.id,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/history/${selectedTransaction?.id}`);
      const body = await res.json();
      return body.success ? body.data?.details || [] : [];
    },
  });

  const handleView = (record: HistoryTransaction) => {
    setSelectedTransaction(record);
    setDrawerOpen(true);
  };

  const columnsAll: TableColumnsType<HistoryTransaction> = [
    {
      title: "Mã phiếu",
      dataIndex: "transactionCode",
      key: "transactionCode",
      width: 140,
    },
    {
      title: "Loại",
      dataIndex: "transactionType",
      key: "transactionType",
      width: 120,
      render: (type: string) => {
        const colors = {
          NHAP: "blue",
          XUAT: "orange",
          CHUYEN: "purple",
        };
        const labels = {
          NHAP: "Nhập",
          XUAT: "Xuất",
          CHUYEN: "Chuyển",
        };
        return <Tag color={colors[type as keyof typeof colors]}>{labels[type as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: "Kho xuất",
      dataIndex: "fromWarehouseName",
      key: "fromWarehouseName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Kho nhập",
      dataIndex: "toWarehouseName",
      key: "toWarehouseName",
      width: 180,
      render: (val: string | undefined) => val || "-",
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
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
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
      width: 100,
      fixed: "right",
      render: (_: unknown, record: HistoryTransaction) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
          Xem
        </Button>
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } = useColumn({ defaultColumns: columnsAll });

  const filtered = applyFilter<HistoryTransaction>(transactions);

  if (!can("inventory.history", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  if (!warehouseId) {
    return (
      <div className="p-6">
        <h3>Không tìm thấy warehouseId trong route.</h3>
        <Button onClick={() => router.push("/inventory/transaction-history")}>Quay lại</Button>
      </div>
    );
  }

  return (
    <>
      <WrapperContent<HistoryTransaction>
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["inventory", "history", warehouseId],
          searchInput: {
            placeholder: "Tìm kiếm lịch sử giao dịch",
            filterKeys: ["transactionCode", "fromWarehouseName", "toWarehouseName", "createdByName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "transactionType",
                label: "Loại giao dịch",
                options: [
                  { label: "Nhập kho", value: "NHAP" },
                  { label: "Xuất kho", value: "XUAT" },
                  { label: "Chuyển kho", value: "CHUYEN" },
                ],
              },
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
          loading={isLoading || isFetching}
          paging
          rank
        />
      </WrapperContent>

      <Drawer
        title="Chi tiết giao dịch"
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
              <Descriptions.Item label="Loại giao dịch">
                <Tag color={
                  selectedTransaction.transactionType === "NHAP" ? "blue" :
                  selectedTransaction.transactionType === "XUAT" ? "orange" : "purple"
                }>
                  {selectedTransaction.transactionType === "NHAP" ? "Nhập kho" :
                   selectedTransaction.transactionType === "XUAT" ? "Xuất kho" : "Chuyển kho"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={
                  selectedTransaction.status === "PENDING" ? "orange" :
                  selectedTransaction.status === "APPROVED" ? "blue" : "green"
                }>
                  {selectedTransaction.status === "PENDING" ? "Chờ duyệt" :
                   selectedTransaction.status === "APPROVED" ? "Đã duyệt" : "Hoàn thành"}
                </Tag>
              </Descriptions.Item>
              {selectedTransaction.fromWarehouseName && (
                <Descriptions.Item label="Kho xuất">
                  {selectedTransaction.fromWarehouseName}
                </Descriptions.Item>
              )}
              {selectedTransaction.toWarehouseName && (
                <Descriptions.Item label="Kho nhập">
                  {selectedTransaction.toWarehouseName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Người tạo">
                {selectedTransaction.createdByName}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Date(selectedTransaction.createdAt).toLocaleString("vi-VN")}
              </Descriptions.Item>
              {selectedTransaction.approvedByName && (
                <>
                  <Descriptions.Item label="Người duyệt">
                    {selectedTransaction.approvedByName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày duyệt">
                    {selectedTransaction.approvedAt ? new Date(selectedTransaction.approvedAt).toLocaleString("vi-VN") : "-"}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedTransaction.notes || "-"}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h3 className="text-lg font-semibold mb-4">Chi tiết hàng hóa</h3>
              <table className="w-full border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left border">Mã</th>
                    <th className="px-4 py-2 text-left border">Tên</th>
                    <th className="px-4 py-2 text-left border">Loại</th>
                    <th className="px-4 py-2 text-right border">Số lượng</th>
                    <th className="px-4 py-2 text-left border">ĐVT</th>
                    <th className="px-4 py-2 text-right border">Đơn giá</th>
                    <th className="px-4 py-2 text-right border">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionDetails.map((detail, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border font-mono text-sm">{detail.itemCode}</td>
                      <td className="px-4 py-2 border">{detail.itemName}</td>
                      <td className="px-4 py-2 border">
                        <Tag color={detail.itemType === "NVL" ? "purple" : "green"}>
                          {detail.itemType === "NVL" ? "NVL" : "TP"}
                        </Tag>
                      </td>
                      <td className="px-4 py-2 border text-right">{formatQuantity(detail.quantity)}</td>
                      <td className="px-4 py-2 border">{detail.unit}</td>
                      <td className="px-4 py-2 border text-right">{formatCurrency(detail.unitPrice, "")}</td>
                      <td className="px-4 py-2 border text-right font-semibold">{formatCurrency(detail.totalAmount, "")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={6} className="px-4 py-2 border text-right">Tổng cộng:</td>
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
    </>
  );
}
