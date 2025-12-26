"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import useColumn from "@/hooks/useColumn";
import { Tag, type TableColumnsType } from "antd";
import Link from "next/link";

type Warehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName?: string;
  isActive?: boolean;
};

export default function WarehousesHub({ path }: { path: string }) {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();

  const {
    data: warehousesData = [],
    isLoading,
    isFetching,
  } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  const filtered = applyFilter<Warehouse>(warehousesData || []);

  const columnsAll: TableColumnsType<Warehouse> = [
    {
      title: "Mã kho",
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
    },
    {
      title: "Tên kho",
      dataIndex: "warehouseName",
      key: "warehouseName",
      width: 240,
    },
    {
      title: "Loại",
      dataIndex: "warehouseType",
      key: "warehouseType",
      width: 120,
      render: (val: string) => (
        <Tag color={val === "NVL" ? "purple" : "green"}>
          {val === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Warehouse) => (
        <Link href={`/inventory/${path}/${record.id}`}>Quản lý</Link>
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      <WrapperContent<Warehouse>
        isNotAccessible={!can("admin.warehouses", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["warehouses"],
          searchInput: {
            placeholder: "Tìm kiếm kho",
            filterKeys: ["warehouseName", "warehouseCode", "branchName"],
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
    </>
  );
}
