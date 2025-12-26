"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatQuantity } from "@/utils/format";
import { DownloadOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Descriptions, Drawer, Select, Spin, Table, Tag } from "antd";
import { useEffect, useState } from "react";

type TransactionHistory = {
  id: number;
  transactionCode: string;
  transactionType: "NHAP" | "XUAT" | "CHUYEN";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  createdAt: string;
  notes?: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
};

type BalanceItem = {
  warehouseId: number;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  itemType: "NVL" | "THANH_PHAM";
  quantity: number;
  unit: string;
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
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BalanceItem | null>(null);
  const [itemHistory, setItemHistory] = useState<TransactionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const columnsAll: TableColumnsType<BalanceItem> = [
    { title: "Mã", dataIndex: "itemCode", key: "itemCode", width: 140 },
    { title: "Tên", dataIndex: "itemName", key: "itemName", width: 300 },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 120,
      render: (t: string) => (
        <Tag color={t === "NVL" ? "purple" : "green"}>
          {t === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 140,
      align: "right",
      render: (q: number) => formatQuantity(q),
    },
    { title: "Đơn vị", dataIndex: "unit", key: "unit", width: 120 },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const { exportToXlsx } = useFileExport(columnsAll);
  const { openFileDialog } = useFileImport();

  const { data: balanceData = { details: [], summary: [] }, isLoading, isFetching, error: balanceError } =
    useQuery({
      queryKey: ["inventory", "balance", selectedWarehouseId],
      enabled: !!selectedWarehouseId,
      refetchOnMount: 'always', // Luôn refetch khi mount/quay lại trang
      queryFn: async () => {
        console.log(`📦 [Balance Page] Fetching balance for warehouse ${selectedWarehouseId}`);
        const res = await fetch(
          `/api/inventory/balance?warehouseId=${selectedWarehouseId}`
        );
        const body = await res.json();
        console.log(`📦 [Balance Page] Response:`, body);

        if (!body.success) {
          throw new Error(body.error || 'Failed to fetch balance');
        }

        return body.data;
      },
      staleTime: 30 * 1000, // 30 giây - ngắn hơn để data luôn fresh
    });

  // Debug log
  console.log(`📦 [Balance Page] Selected warehouse: ${selectedWarehouseId}`);
  console.log(`📦 [Balance Page] Warehouses:`, warehousesData);
  console.log(`📦 [Balance Page] Balance data:`, balanceData);
  console.log(`📦 [Balance Page] Error:`, balanceError);

  if (!can("inventory.balance", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  const details: BalanceItem[] = balanceData.details || [];
  const filteredDetails = applyFilter<BalanceItem>(details);

  const handleExportExcel = () => {
    const warehouseName = warehousesData.find(w => w.id === selectedWarehouseId)?.warehouseName || 'kho';
    exportToXlsx(filteredDetails, `ton-kho-${warehouseName}`);
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

  const handleViewDetail = async (item: BalanceItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
    setHistoryLoading(true);
    setItemHistory([]);

    try {
      const res = await fetch(
        `/api/inventory/item-history?itemCode=${encodeURIComponent(item.itemCode)}&warehouseId=${item.warehouseId}`
      );
      const body = await res.json();
      if (body.success) {
        setItemHistory(body.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch item history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <>
      <WrapperContent<BalanceItem>
        isLoading={isLoading}
        header={{
          searchInput: {
            placeholder: "Tìm kiếm",
            filterKeys: ["itemName", "itemCode"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "itemType",
                label: "Loại",
                options: [
                  { label: "Nguyên vật liệu", value: "NVL" },
                  { label: "Thành phẩm", value: "THANH_PHAM" },
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
          customToolbar: (
            <Select
              style={{ width: 200 }}
              placeholder="Chọn kho"
              value={selectedWarehouseId}
              onChange={(value) => setSelectedWarehouseId(value)}
              options={warehousesData.map((w) => ({
                label: `${w.warehouseName} (${w.branchName || ''})`,
                value: w.id,
              }))}
            />
          ),
          buttonEnds: [
            {
              type: 'default',
              name: 'Làm mới',
              onClick: () => {
                queryClient.invalidateQueries({ queryKey: ['inventory', 'balance'] });
              },
              icon: <ReloadOutlined spin={isFetching} />,
            },
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
          ],
        }}
      >
        <CommonTable
          loading={isLoading}
          columns={getVisibleColumns()}
          dataSource={filteredDetails}
          paging
          rank
          onRowClick={handleViewDetail}
        />
      </WrapperContent>

      <Drawer
        title="Chi tiết tồn kho"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
      >
        {selectedItem && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Mã hàng hóa">
                {selectedItem.itemCode}
              </Descriptions.Item>
              <Descriptions.Item label="Tên hàng hóa">
                {selectedItem.itemName}
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={selectedItem.itemType === "NVL" ? "purple" : "green"}>
                  {selectedItem.itemType === "NVL" ? "Nguyên vật liệu" : "Thành phẩm"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Kho">
                {selectedItem.warehouseName}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng tồn">
                <span className="text-lg font-semibold text-blue-600">
                  {formatQuantity(selectedItem.quantity, selectedItem.unit)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Đơn vị tính">
                {selectedItem.unit}
              </Descriptions.Item>
            </Descriptions>

            {/* Lịch sử xuất nhập */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Lịch sử xuất nhập</h3>
              {historyLoading ? (
                <div className="text-center py-8">
                  <Spin />
                </div>
              ) : itemHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chưa có lịch sử giao dịch
                </div>
              ) : (
                <Table
                  dataSource={itemHistory}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: "Mã phiếu",
                      dataIndex: "transactionCode",
                      key: "transactionCode",
                      width: 130,
                      render: (code: string) => (
                        <span className="font-mono text-xs">{code}</span>
                      ),
                    },
                    {
                      title: "Loại",
                      dataIndex: "transactionType",
                      key: "transactionType",
                      width: 80,
                      render: (type: string) => (
                        <Tag
                          color={
                            type === "NHAP"
                              ? "green"
                              : type === "XUAT"
                                ? "red"
                                : "blue"
                          }
                        >
                          {type === "NHAP" ? "Nhập" : type === "XUAT" ? "Xuất" : "Chuyển"}
                        </Tag>
                      ),
                    },
                    {
                      title: "SL",
                      dataIndex: "quantity",
                      key: "quantity",
                      width: 80,
                      align: "right" as const,
                      render: (q: number, record: TransactionHistory) => (
                        <span
                          className={
                            record.transactionType === "NHAP"
                              ? "text-green-600"
                              : record.transactionType === "XUAT"
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {record.transactionType === "NHAP" ? "+" : record.transactionType === "XUAT" ? "-" : ""}
                          {formatQuantity(q)}
                        </span>
                      ),
                    },
                    {
                      title: "Đơn giá",
                      dataIndex: "unitPrice",
                      key: "unitPrice",
                      width: 100,
                      align: "right" as const,
                      render: (v: number) => formatCurrency(v, ""),
                    },
                    {
                      title: "Thành tiền",
                      dataIndex: "totalAmount",
                      key: "totalAmount",
                      width: 110,
                      align: "right" as const,
                      render: (v: number) => formatCurrency(v, ""),
                    },
                    {
                      title: "Ngày",
                      dataIndex: "createdAt",
                      key: "createdAt",
                      width: 100,
                      render: (d: string) =>
                        new Date(d).toLocaleDateString("vi-VN"),
                    },
                  ]}
                />
              )}
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
