import { IPagination } from "@/hooks/useFilter";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PropRowDetails } from "@/types/table";
import { DeleteOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App, Button, Card, Drawer, Empty, Pagination, Skeleton, Table, Tag } from "antd";
import React, { useRef, useState } from "react";

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
  // New responsive options
  mobileCardRender?: (record: T, index: number) => React.ReactNode;
  mobileColumns?: (keyof T | string)[];
  showMobileCards?: boolean;
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
  mobileCardRender,
  mobileColumns,
  showMobileCards = true,
}: ICommonTableProps<T>) => {
  const isMobile = useIsMobile();
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { modal } = App.useApp();
  
  // Force re-check on mount để đảm bảo mobile detection đúng
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const dataLength = total || dataSource?.length || 0;

  const handlePageChange = (page: number, pageSize?: number) => {
    pagination?.onChange(page, pageSize);
    setTimeout(() => {
      if (tableContainerRef.current) {
        const tableTop = tableContainerRef.current.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: tableTop, behavior: 'smooth' });
      }
    }, 50);
  };

  // Slice data for pagination
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
        const target = event.target as HTMLElement;
        const interactiveElements = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"];

        if (
          interactiveElements.includes(target.tagName) ||
          target.closest("button, a, input, select, textarea, .ant-checkbox-wrapper")
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

  // Process columns
  const processedColumns = [...columns];
  const hasNo = processedColumns.some((col) => col.key === "stt");
  
  if (rank && !hasNo && !isMobile) {
    processedColumns.unshift({
      title: "#",
      key: "stt",
      width: 50,
      fixed: 'left',
      render: (_, __, index) => (
        <div className="font-medium text-gray-500">
          {index + 1 + ((pagination?.current ?? 1) - 1) * (pagination?.limit ?? 20)}
        </div>
      ),
    });
  }

  processedColumns.forEach((col) => {
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
      col.width = 120;
    }
  });

  // Filter columns for mobile if mobileColumns specified
  const getVisibleColumns = (): TableColumnsType<T> => {
    if (!isMobile || !mobileColumns || mobileColumns.length === 0) {
      return processedColumns;
    }
    
    return processedColumns.filter(col => {
      const dataIndex = 'dataIndex' in col ? col.dataIndex : col.key;
      return mobileColumns.includes(dataIndex as string) || col.key === 'stt' || col.key === 'action';
    });
  };

  // Determine if should show cards - hiển thị card khi mobile (< 768px)
  // Chỉ render sau khi mounted để tránh hydration mismatch
  const shouldShowCards = mounted && showMobileCards && isMobile;

  // Debug log - bật để kiểm tra trên thiết bị thật
  // if (typeof window !== 'undefined') {
  //   console.log('CommonTable Debug:', { isMobile, mounted, shouldShowCards, innerWidth: window.innerWidth });
  // }

  // Default card render
  const defaultCardRender = (record: T, index: number) => {
    const visibleCols = mobileColumns 
      ? processedColumns.filter(col => {
          const dataIndex = 'dataIndex' in col ? col.dataIndex : col.key;
          return mobileColumns.includes(dataIndex as string);
        })
      : processedColumns.slice(0, 4);

    const recordId = (record as { id?: React.Key }).id;
    const isSelected = rowSelection?.selectedRowKeys.includes(recordId as React.Key);

    return (
      <Card
        key={recordId as React.Key || index}
        size="small"
        className={`mb-3 transition-all duration-200 ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
        } ${onRowClick || DrawerDetails ? 'cursor-pointer active:scale-[0.99]' : ''}`}
        onClick={() => {
          if (onRowClick) onRowClick(record);
          else if (DrawerDetails) setSelectedRow(record);
        }}
      >
        <div className={`flex gap-3 ${rowSelection ? 'items-start' : ''}`}>
          {rowSelection && (
            <div className="flex-shrink-0 pt-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  const newKeys = isSelected
                    ? rowSelection.selectedRowKeys.filter(k => k !== recordId)
                    : [...rowSelection.selectedRowKeys, recordId as React.Key];
                  rowSelection.onChange(newKeys);
                }}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0 space-y-2">
          {rank && (
            <Tag color="blue" className="mb-2">
              #{index + 1 + ((pagination?.current ?? 1) - 1) * (pagination?.limit ?? 20)}
            </Tag>
          )}
          
            {visibleCols.map((col, colIndex) => {
              const dataIndex = 'dataIndex' in col ? col.dataIndex : null;
              const value = dataIndex ? (record as Record<string, unknown>)[dataIndex as string] : null;
              const title = typeof col.title === 'string' ? col.title : '';
              
              const rendered = col.render 
                ? col.render(value, record, index)
                : value;
              
              // Handle RenderedCell type from Ant Design
              const displayValue = rendered && typeof rendered === 'object' && 'children' in rendered
                ? (rendered as { children: React.ReactNode }).children
                : rendered as React.ReactNode;

              return (
                <div key={colIndex} className="flex justify-between items-start gap-2">
                  <span className="text-gray-500 text-sm flex-shrink-0">{title}:</span>
                  <span className="text-right font-medium text-sm break-words">
                    {displayValue ?? '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  // Footer with pagination
  const footerContent = (
    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between'} items-center w-full sticky bottom-0 z-10 bg-white py-3 px-2 border-t`}>
      <div className="flex items-center gap-2">
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
        
        {rowSelection && !isMobile && (
          <span className="text-gray-500 text-sm">
            Đã chọn: {rowSelection.selectedRowKeys.length}/{dataLength}
          </span>
        )}
      </div>
      
      <div className={isMobile ? "w-full flex justify-center" : ""}>
        {paging && pagination && (
          <Pagination
            onChange={handlePageChange}
            pageSize={pagination.limit}
            total={total ?? dataSource?.length ?? 0}
            showSizeChanger={!isMobile}
            onShowSizeChange={(_, size) => pagination.onChange(1, size)}
            current={pagination.current}
            showTotal={isMobile ? undefined : (total) => `Tổng ${total} bản ghi`}
            size={isMobile ? "small" : "default"}
            simple={isMobile}
            pageSizeOptions={['10', '20', '50', '100']}
          />
        )}
      </div>
    </div>
  );

  // Loading skeleton for cards
  const CardSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i} size="small" className="mb-3">
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </div>
  );

  // Mobile card view
  if (shouldShowCards) {
    return (
      <div ref={tableContainerRef} className="w-full">
        {/* Select all on mobile */}
        {rowSelection && paginatedData && paginatedData.length > 0 && (
          <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rowSelection.selectedRowKeys.length === paginatedData.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    const allIds = paginatedData.map(item => (item as { id: React.Key }).id);
                    rowSelection.onChange(allIds);
                  } else {
                    rowSelection.onChange([]);
                  }
                }}
                className="w-5 h-5"
              />
              <span className="text-sm">Chọn tất cả</span>
            </label>
            <span className="text-sm text-gray-500">
              {rowSelection.selectedRowKeys.length}/{paginatedData.length}
            </span>
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <CardSkeleton />
        ) : paginatedData && paginatedData.length > 0 ? (
          <div className="space-y-1">
            {paginatedData.map((record, index) => 
              mobileCardRender 
                ? mobileCardRender(record, index)
                : defaultCardRender(record, index)
            )}
          </div>
        ) : (
          <Empty description="Không có dữ liệu" className="py-8" />
        )}

        {/* Footer */}
        {paging && footerContent}

        {/* Drawer */}
        {DrawerDetails && selectedRow && (
          <Drawer
            open={!!selectedRow}
            title="Chi tiết"
            width="100%"
            height="90vh"
            placement="bottom"
            onClose={() => setSelectedRow(null)}
            destroyOnHidden
            className="rounded-t-xl"
          >
            <DrawerDetails onClose={() => setSelectedRow(null)} data={selectedRow} />
          </Drawer>
        )}
      </div>
    );
  }

  // Table view (tablet and desktop)
  return (
    <>
      <div ref={tableContainerRef} className="relative w-full">
        <Table<T>
          rowKey="id"
          bordered={true}
          loading={loading}
          columns={getVisibleColumns()}
          dataSource={paginatedData}
          pagination={false}
          onRow={onClickRow}
          size={isMobile ? "small" : "middle"}
          rowSelection={rowSelection ? {
            type: 'checkbox',
            selectedRowKeys: rowSelection.selectedRowKeys,
            onChange: rowSelection.onChange,
            columnWidth: isMobile ? 40 : 50,
          } : undefined}
          sticky={!isMobile}
          className="min-w-full"
          rowClassName={(_, index) => 
            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
          }
        />

        {/* Footer */}
        {paging && footerContent}
      </div>

      {/* Drawer */}
      {DrawerDetails && selectedRow && (
        <Drawer
          open={!!selectedRow}
          title="Chi tiết"
          width={isMobile ? "100%" : (drawerWidth || 600)}
          placement={isMobile ? "bottom" : "right"}
          height={isMobile ? "90vh" : undefined}
          onClose={() => setSelectedRow(null)}
          destroyOnHidden
          className={isMobile ? "rounded-t-xl" : ""}
        >
          <DrawerDetails onClose={() => setSelectedRow(null)} data={selectedRow} />
        </Drawer>
      )}
    </>
  );
};

export default CommonTable;
