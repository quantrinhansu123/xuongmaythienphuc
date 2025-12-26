import { IPagination } from "@/hooks/useFilter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PropRowDetails } from "@/types/table";
import type { TableColumnsType } from "antd";
import { Drawer, Pagination, Table } from "antd";
import { useState } from "react";

interface ICommonTableProps<T> {
  sortable?: boolean;
  total?: number;
  dataSource?: T[];
  columns: TableColumnsType<T>;
  paging?: boolean;
  rank?: boolean;
  loading: boolean;
  pagination?: IPagination & {
    onChange: (page: number, pageSize?: number) => void;
  };
  DrawerDetails?: React.ComponentType<PropRowDetails<T>>;
  onRowClick?: (record: T) => void;
  rowSelection?: {
    selectedRowKeys: React.Key[];
    onChange: (keys: React.Key[]) => void;
  };
}

const CommonTable = <T extends object>({
  sortable = true,
  dataSource,
  total,
  DrawerDetails,
  columns,
  paging = true,
  rank = false,
  loading = false,
  pagination,
  onRowClick,
  rowSelection,
}: ICommonTableProps<T>) => {
  const isMobile = useIsMobile();
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  const dataLength = total || dataSource?.length || 0;

  const handlePageChange = (page: number, pageSize?: number) => {
    pagination?.onChange(page, pageSize);
  };

  // Slice data for pagination when using client-side pagination
  const paginatedData =
    paging && pagination && dataSource
      ? dataSource.slice(
          (pagination.current - 1) * pagination.limit,
          pagination.current * pagination.limit
        )
      : dataSource;

  const onClickRow = (record: T) => {
    return {
      onClick: (event: React.MouseEvent) => {
        // Skip row click if clicking on interactive elements
        const target = event.target as HTMLElement;
        const interactiveElements = [
          "BUTTON",
          "A",
          "INPUT",
          "SELECT",
          "TEXTAREA",
        ];

        if (
          interactiveElements.includes(target.tagName) ||
          target.closest("button, a, input, select, textarea")
        ) {
          return;
        }

        if (onRowClick) {
          onRowClick(record);
        } else if (DrawerDetails) {
          setSelectedRow(record);
        }
      },
      style: { cursor: onRowClick || DrawerDetails ? 'pointer' : 'default' },
    };
  };

  const hasNo = columns.some((col) => col.key === "stt");
  if (rank && !hasNo && !isMobile) {
    columns.unshift({
      title: "#",
      key: "stt",
      width: 50,
      render: (_, __, index) => (
        <div>
          {index +
            1 +
            ((pagination?.current ?? 1) - 1) * (pagination?.limit ?? 20)}
        </div>
      ),
    });
  }

  columns.forEach((col) => {
    if (!col.sorter && "dataIndex" in col && col.dataIndex && sortable) {
      col.sorter = (a: T, b: T) => {
        const aValue = a[col.dataIndex as keyof T];
        const bValue = b[col.dataIndex as keyof T];
        if (typeof aValue === "number" && typeof bValue === "number") {
          return aValue - bValue;
        }
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue);
        }
        return 0;
      };
    }
    if (col.width === undefined) {
      col.width = 100;
    }
  });
  const footerProps = {
    scroll: {
      x: "horizontal",
      y: "calc(100vh - 300px)", // Adjust based on your header/footer height
    },
    footer: () => (
      <div className="flex justify-end w-full sticky bottom-0 z-10">
        {paging && pagination && (
          <Pagination
            onChange={handlePageChange}
            pageSize={pagination.limit}
            total={total ?? dataSource?.length ?? 0}
            showSizeChanger
            onShowSizeChange={(_, size) =>
              pagination.onChange(pagination.current, size)
            }
            current={pagination.current}
            showTotal={(total) => `Tổng ${total} bản ghi`}
          />
        )}
      </div>
    ),
  };

  return (
    <>
      <div className="relative">
        <Table<T>
          {...(paging ? footerProps : {})}
          rowKey="id"
          bordered={true}
          loading={loading}
          columns={columns}
          dataSource={paginatedData}
          pagination={false}
          onRow={onClickRow}
          rowSelection={rowSelection ? {
            type: 'checkbox',
            selectedRowKeys: rowSelection.selectedRowKeys,
            onChange: rowSelection.onChange,
          } : undefined}
        />
      </div>

      {DrawerDetails && selectedRow && (
        <Drawer
          open={!!selectedRow}
          title="Chi tiết"
          size={isMobile ? "default" : 600}
          onClose={() => setSelectedRow(null)}
          destroyOnHidden
        >
          <DrawerDetails
            onClose={() => setSelectedRow(null)}
            data={selectedRow}
          />
        </Drawer>
      )}
    </>
  );
};

export default CommonTable;
