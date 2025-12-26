"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatQuantity } from "@/utils/format";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Button, Segmented, Spin, Tag } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type BalanceItem = {
  warehouseId: number;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  itemType: "NVL" | "THANH_PHAM";
  quantity: number;
  unit: string;
};

export default function PageClient() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const warehouseId = params?.id;
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();

  const [view, setView] = useState<"detail" | "summary">("detail");

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

  const { data: balanceData = { details: [], summary: [] }, isLoading, error: queryError } =
    useQuery({
      queryKey: ["inventory", "balance", warehouseId],
      enabled: !!warehouseId,
      queryFn: async () => {
        const res = await fetch(
          `/api/inventory/balance${
            warehouseId ? `?warehouseId=${warehouseId}` : ""
          }`
        );
        const body = await res.json();
        
        if (!body.success) {
          throw new Error(body.error || 'Failed to fetch balance');
        }
        
        return body.data;
      },
      staleTime: 60 * 1000,
    });

  if (!can("inventory.balance", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  if (!warehouseId) {
    return (
      <div className="p-6">
        <h3>Không tìm thấy warehouseId trong route.</h3>
        <Button onClick={() => router.push("/inventory")}>Quay lại</Button>
      </div>
    );
  }

  const details: BalanceItem[] = balanceData.details || [];
  type SummaryItem = {
    itemCode: string;
    itemName: string;
    itemType: "NVL" | "THANH_PHAM";
    totalQuantity: number;
    unit: string;
  };
  const summary: SummaryItem[] = (balanceData.summary as SummaryItem[]) || [];

  const filteredDetails = applyFilter<BalanceItem>(details);

  // Hiển thị lỗi nếu có
  if (queryError) {
    return (
      <div className="p-6">
        <h3 className="text-red-600">Lỗi: {queryError instanceof Error ? queryError.message : 'Unknown error'}</h3>
        <Button onClick={() => router.push("/inventory/balance")}>Quay lại</Button>
      </div>
    );
  }

  return (
    <WrapperContent<BalanceItem>
      isLoading={isLoading}
      header={{
        searchInput: {
          placeholder: "Tìm kiếm kho",
          filterKeys: ["itemName", "itemCode"],
        },
        filters: {
          fields: [],
          onApplyFilter: (arr) => updateQueries(arr),
          onReset: () => reset(),
          query,
        },
        columnSettings: {
          columns: columnsCheck,
          onChange: (c) => updateColumns(c),
          onReset: () => resetColumns(),
        },
        buttonEnds: [
          {
            name: "",
            icon: (
              <Segmented
                value={view}
                onChange={(v) => setView(v as "detail" | "summary")}
                options={[
                  { label: "Chi tiết", value: "detail" },
                  { label: "Tổng hợp", value: "summary" },
                ]}
              />
            ),
            type: "text",
            onClick: () => {},
          },
        ],
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      ) : view === "detail" ? (
        <CommonTable
          loading={isLoading}
          columns={getVisibleColumns()}
          dataSource={filteredDetails}
          paging
          rank
        />
      ) : (
        <table className="w-full bg-white rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Tổng tồn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Đơn vị
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {summary.map((s) => (
              <tr key={s.itemCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{s.itemCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{s.itemName}</td>
                <td className="px-6 py-4">
                  <Tag color={s.itemType === "NVL" ? "purple" : "green"}>
                    {s.itemType === "NVL" ? "NVL" : "Thành phẩm"}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm text-right font-bold">
                  {formatQuantity(s.totalQuantity || 0)}
                </td>
                <td className="px-6 py-4 text-sm">{s.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WrapperContent>
  );
}
