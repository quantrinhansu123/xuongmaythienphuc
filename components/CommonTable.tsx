import { IPagination } from "@/hooks/useFilter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PropRowDetails } from "@/types/table";
import { DeleteOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Button, Drawer, Pagination, Table } from "antd";
import { useRef, useState } from "react";

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
  onBulkDelete?: (ids: React.Key[]) => Promise<void>;
  bulkDeleteConfig?: {
    confirmTitle?: string;
    confirmMessage?: string;
  };
  drawerWidth?: number | string;
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
  onBulkDelete,
  bulkDeleteConfig,
  drawerWidth,
}: ICommonTableProps<T>) => {
  const isMobile = useIsMobile();
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { modal } = App.useApp();

  const dataLength = total || dataSource?.length || 0;

  const handlePageChange = (page: number, pageSize?: number) => {
    pagination?.onChange(page, pageSize);
    // Cuộn lên đầu bảng khi chuyển trang
    setTimeout(() => {
      if (tableContainerRef.current) {
        const tableTop = tableContainerRef.current.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: tableTop, behavior: 'smooth' });
      }
    }, 50);
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
      x: isMobile ? 800 : "100%",
    },
    footer: () => (
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between'} items-center w-full sticky bottom-0 z-10 bg-white py-2 px-1`}>
        <div>
          {onBulkDelete && rowSelection && rowSelection.selectedRowKeys.length > 0 && (
            <Button
              danger
              size={isMobile ? "small" : "middle"}
              icon={<DeleteOutlined />}
              onClick={() => {
                const count = rowSelection.selectedRowKeys.length;
                modal.confirm({
                  title: bulkDeleteConfig?.confirmTitle || 'Xác nhận xóa',
                  content: (bulkDeleteConfig?.confirmMessage || 'Bạn có chắc muốn xóa {count} mục đã chọn?').replace('{count}', String(count)),
                  okText: 'Xóa',
                  okType: 'danger',
                  cancelText: 'Hủy',
                  onOk: async () => {
                    await onBulkDelete(rowSelection.selectedRowKeys);
                    rowSelection.onChange([]);
                  },
                });
              }}
            >
              Xóa {rowSelection.selectedRowKeys.length} mục
            </Button>
          )}
        </div>
        <div className={isMobile ? "w-full flex justify-center" : ""}>
          {paging && pagination && (
            <Pagination
              onChange={handlePageChange}
              pageSize={pagination.limit}
              total={total ?? dataSource?.length ?? 0}
              showSizeChanger={!isMobile}
              onShowSizeChange={(_, size) =>
                pagination.onChange(pagination.current, size)
              }
              current={pagination.current}
              showTotal={isMobile ? undefined : (total) => `Tổng ${total} bản ghi`}
              size={isMobile ? "small" : "default"}
              simple={isMobile}
            />
          )}
        </div>
      </div>
    ),
  };

  return (
    <>
      <div ref={tableContainerRef} className="relative overflow-x-auto">
        <Table<T>
          {...(paging ? footerProps : {})}
          rowKey="id"
          bordered={true}
          loading={loading}
          columns={columns}
          dataSource={paginatedData}
          pagination={false}
          onRow={onClickRow}
          size={isMobile ? "small" : "middle"}
          rowSelection={rowSelection ? {
            type: 'checkbox',
            selectedRowKeys: rowSelection.selectedRowKeys,
            onChange: rowSelection.onChange,
          } : undefined}
          sticky={!isMobile}
        />
      </div>

      {DrawerDetails && selectedRow && (
        <Drawer
          open={!!selectedRow}
          title="Chi tiết"
          width={isMobile ? "100%" : (drawerWidth || 600)}
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
