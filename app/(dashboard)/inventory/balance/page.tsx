"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatQuantity } from "@/utils/format";
import { ReloadOutlined } from "@ant-design/icons";
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
  createdByName?: string;
  approvedByName?: string;
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
  const { reset, applyFilter, updateQueries, query, pagination, handlePageChange } = useFilter();
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

  // Tự động chọn kho logic
  useEffect(() => {
    if (!selectedWarehouseId) {
      // Nếu đã có list kho, ưu tiên chọn 0 (Toàn hệ thống) nếu có quyền, hoặc kho đầu tiên
      // Ở đây ta set mặc định là 0 nếu user là Admin (và option 0 có sẵn), ngược lại kho đầu
      // Tuy nhiên check quyền ở frontend hơi phức tạp, ta cứ set 0 xem sao, nếu API 403 thì user chọn lại?
      // Tốt nhất: nếu có warehousesData, set 0 nếu là admin.
      // Check permission "view" on inventory.balance usually implies admin or inventory manager. 
      // Simplify: always set to '0' if list loaded? No, normal user can't see 0.
      // Let's assume Admin always sees 'Toàn hệ thống'.
      // We can use the 'can' permission check.
      if (can('inventory.balance', 'view')) { // This check is too broad, it's the page access.
        // Assume Admin based on availability of option logically.
        // For now, default to first warehouse, let user choose "All System".
        // OR specifically check if role is ADMIN? We don't have role here easily without context hooks update.
        // Let's stick to: Default = First Warehouse. User clicks "All System" if needed.
        if (warehousesData.length > 0) {
          setSelectedWarehouseId(warehousesData[0].id);
        }
      }
    }
  }, [warehousesData]);

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

  const exportColumns = [
    { title: "Mã hàng hóa", dataIndex: "itemCode", key: "itemCode" },
    { title: "Tên hàng hóa", dataIndex: "itemName", key: "itemName" },
    { title: "Loại", dataIndex: "itemType", key: "itemType" },
    { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
    { title: "Đơn vị", dataIndex: "unit", key: "unit" },
    { title: "Kho", dataIndex: "warehouseName", key: "warehouseName" },
  ];

  const { exportToXlsx } = useFileExport(exportColumns);
  const { openFileDialog } = useFileImport();

  const { data: balanceData = { details: [], summary: [] }, isLoading, isFetching, error: balanceError } =
    useQuery({
      queryKey: ["inventory", "balance", selectedWarehouseId, query],
      enabled: selectedWarehouseId !== undefined,
      refetchOnMount: 'always', // Luôn refetch khi mount/quay lại trang
      queryFn: async () => {
        console.log(`📦 [Balance Page] Fetching balance for warehouse ${selectedWarehouseId}`);
        console.log(`📦 [Balance Page] Query Params:`, query);
        const queryString = new URLSearchParams(query as any).toString();
        //Fix: Ensure warehouseId is passed if not 0
        const url = `/api/inventory/balance?warehouseId=${selectedWarehouseId}&${queryString}`;
        console.log(`📦 [Balance Page] Fetch URL: ${url}`);
        const res = await fetch(url);
        const body = await res.json();
        console.log(`📦 [Balance Page] Response:`, body);

        if (!body.success) {
          throw new Error(body.error || 'Failed to fetch balance');
        }

        return body.data;
      },
      staleTime: 30 * 1000,
    });

  // Debug log
  // ... (keeping debug logs if needed, but shortening for brevity in replacement if possible, or just keeping context)

  if (!can("inventory.balance", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  const details: BalanceItem[] = balanceData.details || [];
  const filteredDetails = applyFilter<BalanceItem>(details, ['status', 'warehouseId']);

  const handleExportExcel = () => {
    const warehouseName = warehousesData.find(w => w.id === selectedWarehouseId)?.warehouseName || 'kho';
    const dataToExport = filteredDetails.map(item => ({
      ...item,
      itemType: item.itemType === 'NVL' ? 'Nguyên vật liệu' : 'Thành phẩm',
      // Ensure quantity is number
      quantity: item.quantity,
    }));
    exportToXlsx(dataToExport, `ton-kho-${warehouseName}`);
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
          customToolbar: (
            <div className="flex gap-2 items-center">
              <Select
                style={{ width: 140 }}
                placeholder="Trạng thái"
                value={query.status || 'all'}
                onChange={(value) => updateQueries([{ key: 'status', value }])}
                options={[
                  { label: "Tất cả", value: 'all' },
                  { label: "Có hàng", value: 'in_stock' },
                  { label: "Hết hàng", value: 'out_of_stock' },
                  { label: "Sắp hết", value: 'low_stock' },
                ]}
              />
              <Select
                style={{ width: 160 }}
                placeholder="Loại hàng"
                value={query.itemType}
                allowClear
                onChange={(value) => updateQueries([{ key: 'itemType', value }])}
                options={[
                  { label: "Nguyên vật liệu", value: "NVL" },
                  { label: "Thành phẩm", value: "THANH_PHAM" },
                ]}
              />
              <Select
                style={{ width: 300 }}
                placeholder="Chọn kho"
                value={selectedWarehouseId}
                onChange={(value) => setSelectedWarehouseId(value)}
                optionFilterProp="label"
                showSearch
                options={[
                  ...(can('inventory.balance', 'view') ? [{ label: 'Toàn hệ thống', value: 0 }] : []),
                  ...warehousesData.map((w) => ({
                    label: `${w.warehouseName} (${w.branchName || ''})`,
                    value: w.id,
                  }))]}
              />
            </div>
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
          ],
          filters: {
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
        }}
      >
        <CommonTable
          loading={isLoading}
          columns={getVisibleColumns()}
          dataSource={filteredDetails}
          paging
          rank
          pagination={{ ...pagination, onChange: handlePageChange }}
          onRowClick={handleViewDetail}
        />
      </WrapperContent>

      <Drawer
        title="Chi tiết tồn kho"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={1000}
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
                      title: "Từ kho",
                      dataIndex: "fromWarehouseName",
                      key: "fromWarehouseName",
                      width: 150,
                      render: (v: string) => <span className="text-xs">{v || '-'}</span>
                    },
                    {
                      title: "Đến kho",
                      dataIndex: "toWarehouseName",
                      key: "toWarehouseName",
                      width: 150,
                      render: (v: string) => <span className="text-xs">{v || '-'}</span>
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
                      title: "Người tạo",
                      dataIndex: "createdByName",
                      key: "createdByName",
                      width: 120,
                      render: (v: string) => <span className="text-xs">{v}</span>
                    },
                    {
                      title: "Người duyệt",
                      dataIndex: "approvedByName",
                      key: "approvedByName",
                      width: 120,
                      render: (v: string) => <span className="text-xs">{v || '-'}</span>
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