/* eslint-disable @typescript-eslint/no-explicit-any */
import AccessDenied from "@/components/AccessDenied";
import { FilterList } from "@/components/FilterList";
import LoaderApp from "@/components/LoaderApp";
import { IParams } from "@/hooks/useFilter";
import { useSetTitlePage } from "@/hooks/useSetTitlePage";
import {
  BREAK_POINT_WIDTH,
  BreakpointEnum,
  useWindowBreakpoint,
} from "@/hooks/useWindowBreakPoint";
import { ColumnSetting, FilterField } from "@/types";
import { queriesToInvalidate } from "@/utils/refetchData";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FilterOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined
} from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Tooltip
} from "antd";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

// Interface cho suggestions
interface SearchSuggestion {
  value: string;
  label: React.ReactNode;
  data?: any;
}

interface SearchInputConfig {
  placeholder: string;
  filterKeys: (keyof any)[];
  suggestions?: {
    apiEndpoint: string;
    labelKey: string;
    valueKey?: string;
    descriptionKey?: string;
    minChars?: number;
    maxResults?: number;
  };
}

interface WrapperContentProps<T extends object> {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  isRefetching?: boolean;
  isNotAccessible?: boolean;
  isEmpty?: boolean;
  header: {
    buttonBackTo?: string;
    refetchDataWithKeys?: string[] | readonly string[];
    buttonEnds?: {
      can?: boolean;
      danger?: boolean;
      isLoading?: boolean;
      type?: "link" | "default" | "text" | "primary" | "dashed" | undefined;
      className?: string;
      onClick?: () => void;
      name: string;
      icon: React.ReactNode;
    }[];
    customToolbar?: React.ReactNode;
    customToolbarSecondRow?: React.ReactNode;
    searchInput?: SearchInputConfig;
    filters?: {
      fields?: FilterField[];
      query?: IParams;
      showFiltersInline?: boolean;
      onApplyFilter: (arr: { key: string; value: any }[]) => void;
      onReset?: () => void;
    };
    columnSettings?: {
      columns: ColumnSetting[];
      onChange: (columns: ColumnSetting[]) => void;
      onReset?: () => void;
    };
  };
  className?: string;
}

function WrapperContent<T extends object>({
  children,
  title,
  header,
  isLoading = false,
  isRefetching = false,
  isNotAccessible = false,
  isEmpty = false,
  className = "",
}: WrapperContentProps<T>) {
  const router = useRouter();
  const [formFilter] = Form.useForm();

  useSetTitlePage(title || "");
  const [isOpenColumnSettings, setIsOpenColumnSettings] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const breakpoint = useWindowBreakpoint();
  const isMobile = BREAK_POINT_WIDTH[breakpoint] <= BREAK_POINT_WIDTH[BreakpointEnum.LG];

  const [searchTerm, setSearchTerm] = useState(() => {
    if (header.searchInput && header.filters?.query) {
      const keys = ["search", ...header.searchInput.filterKeys].join(",");
      return header.filters.query[keys] || "";
    }
    return "";
  });

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (value: string) => {
      const config = header.searchInput?.suggestions;
      if (!config) return;

      const minChars = config.minChars ?? 2;
      if (!value || value.length < minChars) {
        setSuggestions([]);
        return;
      }

      try {
        const maxResults = config.maxResults ?? 10;
        const separator = config.apiEndpoint.includes('?') ? '&' : '?';
        const url = `${config.apiEndpoint}${separator}search=${encodeURIComponent(value)}&limit=${maxResults}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          setSuggestions(data.data.map((item: any) => {
            const label = item[config.labelKey] || '';
            const valueField = config.valueKey ? item[config.valueKey] : label;
            const description = config.descriptionKey ? item[config.descriptionKey] : null;

            return {
              value: String(valueField),
              label: (
                <div className="flex flex-col py-1">
                  <span className="font-medium">{label}</span>
                  {description && <span className="text-xs text-gray-500">{description}</span>}
                </div>
              ),
              data: item,
            };
          }));
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300),
    [header.searchInput?.suggestions]
  );

  // Computed states
  const hasActiveFilters = Boolean(
    header.filters &&
    Object.entries(header.filters.query || {}).some(([key, value]) => {
      if (typeof value === "string" && !key.includes("search")) return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      return false;
    })
  );

  const hasFilters = Boolean(header.filters && Object.values(header.filters.query || {}).length > 0);

  const hasActiveColumnSettings = Boolean(
    header.columnSettings?.columns.some((c) => c.visible === false)
  );

  const handleResetFilters = () => {
    header.filters?.onReset?.();
    formFilter.resetFields();
    setSearchTerm("");
  };

  // Search debounce effect
  useEffect(() => {
    if (!header.filters?.onApplyFilter) return;

    const searchKey = header.searchInput
      ? ["search", ...header.searchInput.filterKeys].join(",")
      : "search";

    const debounced = debounce((value: string) => {
      header.filters!.onApplyFilter([{ key: searchKey, value }]);
    }, 500);

    debounced(searchTerm);
    return () => debounced.cancel();
  }, [searchTerm]);

  // Sort buttons: primary buttons last
  const sortedButtons = (header.buttonEnds || []).slice().sort((a, b) => {
    if (a.type === "primary" && b.type !== "primary") return 1;
    if (a.type !== "primary" && b.type === "primary") return -1;
    return 0;
  });

  const hasFilterFields = header.filters?.fields && header.filters.fields.length > 0;

  // ========== DESKTOP LAYOUT ==========
  if (!isMobile) {
    // Chỉ cần hàng 2 khi có customToolbar VÀ có filterFields hoặc customToolbarSecondRow
    const needsRow2 = header.customToolbar && (hasFilterFields || header.customToolbarSecondRow);

    return (
      <div className={`space-y-3 w-full box-border ${className}`}>
        {/* Row 1: Back + Search + ColumnSettings + (customToolbar HOẶC FilterList) | Refresh + Buttons */}
        <div className="flex items-center gap-3">
          {/* LEFT */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {header.buttonBackTo && (
              <Button
                disabled={isLoading || isRefetching}
                type="default"
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push(header.buttonBackTo!)}
              >
                Quay lại
              </Button>
            )}

            {header.searchInput && (
              header.searchInput.suggestions ? (
                <AutoComplete
                  style={{ minWidth: 200, maxWidth: 300 }}
                  options={suggestions}
                  onSearch={fetchSuggestions}
                  onSelect={(value) => setSearchTerm(value)}
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  placeholder={header.searchInput.placeholder}
                >
                  <Input prefix={<SearchOutlined />} allowClear />
                </AutoComplete>
              ) : (
                <Input
                  style={{ minWidth: 200, maxWidth: 300 }}
                  value={searchTerm}
                  placeholder={header.searchInput.placeholder}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              )
            )}

            {header.columnSettings && (
              <Popover
                trigger="click"
                placement="bottomLeft"
                open={isOpenColumnSettings}
                onOpenChange={setIsOpenColumnSettings}
                content={
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium mb-0">Cài đặt cột</h3>
                      {header.columnSettings.onReset && (
                        <Button type="link" size="small" onClick={header.columnSettings.onReset}>
                          Đặt lại
                        </Button>
                      )}
                    </div>
                    <Divider className="my-2" />
                    <div className="grid grid-rows-5 grid-cols-3 gap-4">
                      {header.columnSettings.columns.map((column) => (
                        <Checkbox
                          key={column.key}
                          checked={column.visible}
                          onChange={(e) => {
                            const newColumns = header.columnSettings!.columns.map((col) =>
                              col.key === column.key ? { ...col, visible: e.target.checked } : col
                            );
                            header.columnSettings!.onChange(newColumns);
                          }}
                        >
                          {column.title}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                }
              >
                <Tooltip title="Cài đặt cột">
                  <Button
                    disabled={isLoading || isRefetching}
                    type={hasActiveColumnSettings ? "primary" : "default"}
                    icon={<SettingOutlined />}
                  />
                </Tooltip>
              </Popover>
            )}

            {/* Nếu có customToolbar thì hiện ở đây, FilterList xuống hàng 2 */}
            {header.customToolbar}

            {/* Nếu không có customToolbar thì FilterList lên hàng 1 */}
            {!header.customToolbar && hasFilterFields && (
              <FilterList
                isMobile={false}
                form={formFilter}
                fields={header.filters!.fields!}
                onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
              />
            )}

            {!header.customToolbar && hasFilters && header.filters?.onReset && (
              <Tooltip title="Đặt lại bộ lọc">
                <Button
                  disabled={isLoading || isRefetching}
                  onClick={handleResetFilters}
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-6">
            {header.refetchDataWithKeys && (
              <Tooltip title="Tải lại dữ liệu">
                <Button
                  disabled={isLoading || isRefetching}
                  type="default"
                  icon={<SyncOutlined spin={isLoading || isRefetching} />}
                  onClick={() => queriesToInvalidate(header.refetchDataWithKeys!)}
                />
              </Tooltip>
            )}

            {sortedButtons.map((btn, idx) => (
              btn.can !== false && (
                <Tooltip key={idx} title={btn.name}>
                  <Button
                    disabled={isLoading || (btn.type === "primary" ? isLoading : isRefetching)}
                    loading={btn.isLoading}
                    danger={btn.danger}
                    type={btn.type}
                    className={btn.className}
                    onClick={btn.onClick}
                    icon={btn.icon}
                  >
                    {btn.name}
                  </Button>
                </Tooltip>
              )
            ))}
          </div>
        </div>

        {/* Row 2: Chỉ hiện khi có customToolbar VÀ có filterFields */}
        {needsRow2 && (
          <div className="flex items-center gap-3">
            {/* LEFT */}
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
              {hasFilterFields && (
                <FilterList
                  isMobile={false}
                  form={formFilter}
                  fields={header.filters!.fields!}
                  onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
                />
              )}
              {header.customToolbarSecondRow}
            </div>

            {/* RIGHT */}
            {hasFilters && header.filters?.onReset && (
              <div className="flex items-center gap-3 flex-shrink-0 ml-6">
                <Tooltip title="Đặt lại bộ lọc">
                  <Button
                    disabled={isLoading || isRefetching}
                    onClick={handleResetFilters}
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {isNotAccessible && !isLoading && <AccessDenied />}
        {isEmpty && !isNotAccessible && !isLoading && !isRefetching && (
          <div className="flex min-h-[400px] items-center justify-center">
            <Empty description="Không có dữ liệu" />
          </div>
        )}
        {isLoading && !isRefetching && (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoaderApp />
          </div>
        )}
        {!isLoading && !isNotAccessible && !isEmpty && children}
      </div>
    );
  }

  // ========== MOBILE LAYOUT ==========
  return (
    <div className={`space-y-4 w-full box-border ${className}`}>
      {/* Row 1: Back button | Refresh + Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {header.buttonBackTo && (
            <Button
              disabled={isLoading || isRefetching}
              type="default"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(header.buttonBackTo!)}
            />
          )}
        </div>

        <div className="flex gap-2 items-center">
          {header.refetchDataWithKeys && (
            <Button
              disabled={isLoading || isRefetching}
              type="default"
              icon={<SyncOutlined spin={isLoading || isRefetching} />}
              onClick={() => queriesToInvalidate(header.refetchDataWithKeys!)}
            />
          )}

          {hasFilters && header.filters?.onReset && (
            <Button onClick={handleResetFilters} danger icon={<DeleteOutlined />} />
          )}

          {sortedButtons.map((btn, idx) => (
            btn.can !== false && (
              <Tooltip key={idx} title={btn.name}>
                <Button
                  disabled={btn.isLoading}
                  loading={btn.isLoading}
                  danger={btn.danger}
                  type={btn.type}
                  className={btn.className}
                  onClick={btn.onClick}
                  icon={btn.icon}
                />
              </Tooltip>
            )
          ))}
        </div>
      </div>

      {/* Row 2: Search + Filter button */}
      {(header.searchInput || header.customToolbar || hasFilterFields || header.columnSettings) && (
        <div className="flex gap-2 items-center w-full">
          {header.searchInput && (
            <div className="flex-1 min-w-0">
              {header.searchInput.suggestions ? (
                <AutoComplete
                  className="w-full"
                  options={suggestions}
                  onSearch={fetchSuggestions}
                  onSelect={(value) => setSearchTerm(value)}
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  placeholder={header.searchInput.placeholder}
                >
                  <Input prefix={<SearchOutlined />} allowClear />
                </AutoComplete>
              ) : (
                <Input
                  className="w-full"
                  value={searchTerm}
                  placeholder={header.searchInput.placeholder}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              )}
            </div>
          )}

          {(header.customToolbar || hasFilterFields || header.columnSettings) && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsMobileOptionsOpen(true)}
              type={hasActiveFilters || hasActiveColumnSettings ? "primary" : "default"}
              className="flex-shrink-0"
            />
          )}
        </div>
      )}

      {/* Mobile Filter Modal */}
      <Modal
        title={null}
        open={isMobileOptionsOpen}
        onCancel={() => setIsMobileOptionsOpen(false)}
        footer={null}
        destroyOnHidden
        closable={false}
        styles={{ body: { padding: 0 }, mask: { background: 'rgba(0, 0, 0, 0.45)' } }}
        style={{ top: 'auto', bottom: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 }}
        width="100%"
      >
        <div className="flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
            <h3 className="font-semibold text-lg m-0">Bộ lọc</h3>
            <div className="flex gap-2">
              {(header.filters?.onReset || header.customToolbar) && (
                <Button
                  type="text"
                  danger
                  onClick={() => {
                    formFilter.resetFields();
                    header.filters?.onReset?.();
                    setSearchTerm("");
                  }}
                >
                  Xóa lọc
                </Button>
              )}
              <Button type="primary" onClick={() => setIsMobileOptionsOpen(false)}>
                Xong
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {header.customToolbar && <div className="space-y-3">{header.customToolbar}</div>}

            {hasFilterFields && (
              <Form form={formFilter} layout="vertical" className="space-y-3">
                {header.filters!.fields!.map((field) => {
                  switch (field.type) {
                    case "input":
                      return (
                        <Form.Item key={field.name} name={field.name} label={field.label} className="mb-0">
                          <Input
                            placeholder={field.placeholder || field.label}
                            allowClear
                            size="large"
                            onChange={(e) => header.filters?.onApplyFilter([{ key: field.name, value: e.target.value }])}
                          />
                        </Form.Item>
                      );
                    case "select":
                      return (
                        <Form.Item key={field.name} name={field.name} label={field.label} className="mb-0">
                          <Select
                            mode={field.isMultiple ? "multiple" : undefined}
                            options={field.options || []}
                            placeholder={field.placeholder || field.label}
                            allowClear
                            size="large"
                            showSearch
                            filterOption={(input, option) =>
                              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(value) => header.filters?.onApplyFilter([{ key: field.name, value: value ?? "" }])}
                          />
                        </Form.Item>
                      );
                    case "date":
                      return (
                        <Form.Item key={field.name} name={field.name} label={field.label} className="mb-0">
                          <DatePicker
                            className="w-full"
                            placeholder={field.placeholder || field.label}
                            size="large"
                            inputReadOnly
                            onChange={(date) => header.filters?.onApplyFilter([{ key: field.name, value: date }])}
                          />
                        </Form.Item>
                      );
                    case "dateRange":
                      return (
                        <Form.Item key={field.name} name={field.name} label={field.label} className="mb-0">
                          <DatePicker.RangePicker
                            className="w-full"
                            size="large"
                            inputReadOnly
                            placeholder={["Từ ngày", "Đến ngày"]}
                            onChange={(dates) => header.filters?.onApplyFilter([{ key: field.name, value: dates }])}
                          />
                        </Form.Item>
                      );
                    default:
                      return null;
                  }
                })}
              </Form>
            )}

            {header.columnSettings && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <SettingOutlined className="text-gray-500" />
                    <span className="font-medium">Hiển thị cột</span>
                  </div>
                  {header.columnSettings.onReset && (
                    <Button type="link" size="small" onClick={header.columnSettings.onReset} className="text-gray-500 p-0">
                      Đặt lại
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {header.columnSettings.columns.map((column) => (
                    <label
                      key={column.key}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        column.visible ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Checkbox
                        checked={column.visible}
                        onChange={(e) => {
                          const newColumns = header.columnSettings!.columns.map((col) =>
                            col.key === column.key ? { ...col, visible: e.target.checked } : col
                          );
                          header.columnSettings!.onChange(newColumns);
                        }}
                      />
                      <span className="text-sm truncate">{column.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Content */}
      {isNotAccessible && !isLoading && <AccessDenied />}
      {isEmpty && !isNotAccessible && !isLoading && !isRefetching && (
        <div className="flex min-h-[400px] items-center justify-center">
          <Empty description="Không có dữ liệu" />
        </div>
      )}
      {isLoading && !isRefetching && (
        <div className="flex min-h-[400px] items-center justify-center">
          <LoaderApp />
        </div>
      )}
      {!isLoading && !isNotAccessible && !isEmpty && children}
    </div>
  );
}

export default WrapperContent;
