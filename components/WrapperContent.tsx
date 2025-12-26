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
  SyncOutlined,
} from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Checkbox,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
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
  // Cấu hình suggestions (optional)
  suggestions?: {
    apiEndpoint: string;           // API endpoint để fetch gợi ý
    labelKey: string;              // Field hiển thị (vd: "customerName")
    valueKey?: string;             // Field giá trị (vd: "customerCode")
    descriptionKey?: string;       // Field mô tả phụ (vd: "phone")
    minChars?: number;             // Số ký tự tối thiểu để bắt đầu search (default: 2)
    maxResults?: number;           // Số kết quả tối đa (default: 10)
  };
}

interface LeftControlsProps {
  isMobile: boolean;
  header: {
    buttonBackTo?: string;
    customToolbar?: React.ReactNode;
    customToolbarSecondRow?: React.ReactNode;
    searchInput?: SearchInputConfig;
    columnSettings?: {
      columns: ColumnSetting[];
      onReset?: () => void;
      onChange: (columns: ColumnSetting[]) => void;
    };
    filters?: {
      fields?: FilterField[];
      showFiltersInline?: boolean;  // Hiển thị bộ lọc sẵn không cần ấn nút
      onReset?: () => void;
    };
  };
  isLoading: boolean;
  isRefetching: boolean;
  router: ReturnType<typeof useRouter>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  suggestions: SearchSuggestion[];
  onSearchSuggestions: (value: string) => void;
  isOpenColumnSettings: boolean;
  setIsOpenColumnSettings: (value: boolean) => void;
  hasActiveColumnSettings: boolean;
  hasFilters: boolean;
  hasActiveFilters: boolean;
  handleResetFilters: () => void;
  isFilterVisible: boolean;
  setIsFilterVisible: (value: boolean) => void;
}

const LeftControls: React.FC<LeftControlsProps> = ({
  isMobile,
  header,
  isLoading,
  isRefetching,
  router,
  searchTerm,
  setSearchTerm,
  suggestions,
  onSearchSuggestions,
  isOpenColumnSettings,
  setIsOpenColumnSettings,
  hasActiveColumnSettings,
  hasFilters,
  hasActiveFilters,
  handleResetFilters,
  isFilterVisible,
  setIsFilterVisible,
}) => {
  if (isMobile) {
    return (
      <div>
        {header.buttonBackTo && (
          <Button
            disabled={isLoading || isRefetching}
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(header.buttonBackTo!)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-3">
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
              style={{ width: 300 }}
              options={suggestions}
              onSearch={onSearchSuggestions}
              onSelect={(value) => setSearchTerm(value)}
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
              placeholder={header.searchInput.placeholder}
            >
              <Input prefix={<SearchOutlined />} allowClear />
            </AutoComplete>
          ) : (
            <Input
              style={{ width: 256 }}
              value={searchTerm}
              placeholder={header.searchInput.placeholder}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          )
        )}

        {header.customToolbar && (
          <div className="flex items-center gap-3 flex-wrap">{header.customToolbar}</div>
        )}

        {header.filters && header.filters.fields && !header.filters.showFiltersInline && (
          <Tooltip title={isFilterVisible ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}>
            <Button
              disabled={isLoading || isRefetching}
              type={isFilterVisible ? "primary" : "default"}
              icon={<FilterOutlined />}
              onClick={() => setIsFilterVisible(!isFilterVisible)}
            />
          </Tooltip>
        )}

        {header.columnSettings && (
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <div>
                <div className=" flex  justify-between  items-center">
                  <h3 className=" font-medium  mb-0">Cài đặt cột</h3>
                  {header.columnSettings.onReset && (
                    <Button
                      disabled={isLoading || isRefetching}
                      type="link"
                      size="small"
                      onClick={() => {
                        if (header.columnSettings?.onReset) {
                          header.columnSettings.onReset();
                        }
                      }}
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
                <Divider className=" my-2" />

                <div className="grid grid-rows-5 grid-cols-3 gap-4">
                  {header.columnSettings.columns.map((column) => (
                    <Checkbox
                      key={column.key}
                      checked={column.visible}
                      onChange={(e) => {
                        const newColumns = header.columnSettings!.columns.map(
                          (col) =>
                            col.key === column.key
                              ? { ...col, visible: e.target.checked }
                              : col
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
            open={isOpenColumnSettings}
            onOpenChange={setIsOpenColumnSettings}
          >
            <Tooltip title="Cài đặt cột">
              <span>
                <Button
                  disabled={isLoading || isRefetching}
                  type={hasActiveColumnSettings ? "primary" : "default"}
                  icon={<SettingOutlined />}
                />
              </span>
            </Tooltip>
          </Popover>
        )}

        {hasFilters && header.filters?.onReset && (
          <Tooltip title="Đặt lại bộ lọc">
            <span>
              <Button
                disabled={isLoading || isRefetching}
                onClick={handleResetFilters}
                danger
                icon={<DeleteOutlined />}
              />
            </span>
          </Tooltip>
        )}
      </div>

      {header.customToolbarSecondRow && (
        <div className="flex items-center gap-3 flex-wrap">{header.customToolbarSecondRow}</div>
      )}
    </div>
  );
};

interface RightControlsProps {
  isMobile: boolean;
  header: {
    refetchDataWithKeys?: string[] | readonly string[];
    filters?: {
      onReset?: () => void;
    };
    buttonEnds?: {
      can?: boolean;
      danger?: boolean;
      isLoading?: boolean;
      type?: "link" | "default" | "text" | "primary" | "dashed" | undefined;
      onClick?: () => void;
      name: string;
      icon: React.ReactNode;
    }[];
    searchInput?: SearchInputConfig;
    columnSettings?: {
      columns: ColumnSetting[];
      onChange: (columns: ColumnSetting[]) => void;
      onReset?: () => void;
    };
  };
  isLoading: boolean;
  isRefetching: boolean;
  hasFilters: boolean;
  handleResetFilters: () => void;
  hasActiveFilters: boolean;
  hasActiveColumnSettings: boolean;
  setIsMobileOptionsOpen: (value: boolean) => void;
  queriesToInvalidate: (keys: string[] | readonly string[]) => void;
}

const RightControls: React.FC<RightControlsProps> = ({
  isMobile,
  header,
  isLoading,
  isRefetching,
  hasFilters,
  handleResetFilters,
  hasActiveColumnSettings,
  setIsMobileOptionsOpen,
  queriesToInvalidate,
  hasActiveFilters,
}) => {
  const sortedEnds = (header.buttonEnds || []).slice().sort((a, b) => {
    if (a.type === "primary" && b.type !== "primary") return 1;
    if (a.type !== "primary" && b.type === "primary") return -1;
    return 0;
  });

  if (isMobile) {
    return (
      <div className="flex gap-2 items-center">
        {header.refetchDataWithKeys && (
          <Tooltip title="Tải lại dữ liệu">
            <span>
              <Button
                disabled={isLoading || isRefetching}
                type="default"
                icon={<SyncOutlined spin={isLoading} />}
                onClick={() => {
                  if (header.refetchDataWithKeys) {
                    queriesToInvalidate(header.refetchDataWithKeys);
                  }
                }}
              />
            </span>
          </Tooltip>
        )}

        {hasFilters && header.filters?.onReset && (
          <Tooltip title="Đặt lại bộ lọc">
            <span>
              <Button
                disabled={isLoading || isRefetching}
                onClick={handleResetFilters}
                danger
                icon={<DeleteOutlined />}
              />
            </span>
          </Tooltip>
        )}

        {sortedEnds.map((buttonEnd, index) => {
          if (!buttonEnd.can) return null;
          return (
            <Tooltip key={index} title={buttonEnd.name}>
              <span>
                <Button
                  disabled={isLoading || isRefetching || buttonEnd.can}
                  loading={buttonEnd.isLoading}
                  danger={buttonEnd.danger}
                  type={buttonEnd.type}
                  onClick={buttonEnd.onClick}
                  icon={buttonEnd.icon}
                />
              </span>
            </Tooltip>
          );
        })}

        {(header.searchInput || header.filters || header.columnSettings) && (
          <Tooltip title="Tùy chọn">
            <Button
              disabled={isLoading || isRefetching}
              type={
                hasActiveFilters || hasActiveColumnSettings
                  ? "primary"
                  : "default"
              }
              icon={<FilterOutlined />}
              onClick={() => setIsMobileOptionsOpen(true)}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-center">
      {header.refetchDataWithKeys && (
        <Tooltip title="Tải lại dữ liệu">
          <span>
            <Button
              disabled={isLoading || isRefetching}
              type="default"
              icon={<SyncOutlined spin={isLoading || isRefetching} />}
              onClick={() => {
                if (header.refetchDataWithKeys) {
                  queriesToInvalidate(header.refetchDataWithKeys);
                }
              }}
            />
          </span>
        </Tooltip>
      )}

      {sortedEnds.map((buttonEnd, index) => (
        <Tooltip key={index} title={buttonEnd.name}>
          <span>
            <Button
              disabled={
                isLoading || buttonEnd.type === "primary"
                  ? isLoading
                  : isRefetching
              }
              loading={buttonEnd.isLoading}
              danger={buttonEnd.danger}
              type={buttonEnd.type}
              onClick={buttonEnd.onClick}
              icon={buttonEnd.icon}
            >
              {buttonEnd.name}
            </Button>
          </span>
        </Tooltip>
      ))}
    </div>
  );
};

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
      showFiltersInline?: boolean;  // Hiển thị bộ lọc sẵn không cần ấn nút
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
  // desktop filter visibility is controlled by toggle button
  const [isOpenColumnSettings, setIsOpenColumnSettings] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(
    () => header.filters?.showFiltersInline ?? false
  );
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const breakpoint = useWindowBreakpoint();
  const isMobileView =
    BREAK_POINT_WIDTH[breakpoint] <= BREAK_POINT_WIDTH[BreakpointEnum.LG];
  const [searchTerm, setSearchTerm] = useState(() => {
    if (header.searchInput && header.filters && header.filters.query) {
      const keys = ["search", ...header.searchInput.filterKeys].join(",");
      const query = header.filters.query;
      const term = query[keys];
      return term;
    }
    return "";
  });

  // Fetch suggestions từ API
  const fetchSuggestions = useCallback(
    debounce(async (value: string) => {
      const suggestionsConfig = header.searchInput?.suggestions;
      if (!suggestionsConfig) return;

      const minChars = suggestionsConfig.minChars ?? 2;
      if (!value || value.length < minChars) {
        setSuggestions([]);
        return;
      }

      try {
        const maxResults = suggestionsConfig.maxResults ?? 10;
        const separator = suggestionsConfig.apiEndpoint.includes('?') ? '&' : '?';
        const url = `${suggestionsConfig.apiEndpoint}${separator}search=${encodeURIComponent(value)}&limit=${maxResults}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          const options: SearchSuggestion[] = data.data.map((item: any) => {
            const label = item[suggestionsConfig.labelKey] || '';
            const valueField = suggestionsConfig.valueKey
              ? item[suggestionsConfig.valueKey]
              : label;
            const description = suggestionsConfig.descriptionKey
              ? item[suggestionsConfig.descriptionKey]
              : null;

            return {
              value: String(valueField),
              label: (
                <div className="flex flex-col py-1">
                  <span className="font-medium">{label}</span>
                  {description && (
                    <span className="text-xs text-gray-500">{description}</span>
                  )}
                </div>
              ),
              data: item,
            };
          });
          setSuggestions(options);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    }, 300),
    [header.searchInput?.suggestions]
  );

  const handleSearchSuggestions = (value: string) => {
    if (header.searchInput?.suggestions) {
      fetchSuggestions(value);
    }
  };

  const hasActiveFilters = Boolean(
    header.filters &&
    Object.entries(header.filters.query || {}).some(([key, value]) => {
      if (typeof value === "string" && !key.includes("search"))
        return value.trim() !== "";
      if (Array.isArray(value)) return value.length > 0;
      return false;
    })
  );
  const hasFilters = Boolean(
    header.filters && Object.values(header.filters.query || {}).length > 0
  );
  const hasActiveColumnSettings = Boolean(
    header.columnSettings &&
    header.columnSettings.columns.some((c) => c.visible === false)
  );

  const handleResetFilters = () => {
    if (header.filters?.onReset) {
      header.filters.onReset();
    }
    formFilter.resetFields();
    setSearchTerm("");
  };

  useEffect(() => {
    if (!header.filters || typeof header.filters.onApplyFilter !== "function")
      return;
    const getSearchKey = () => {
      if (header.searchInput && header.filters && header.filters.query) {
        const keys = ["search", ...header.searchInput.filterKeys].join(",");
        return keys;
      }
      return "search";
    };
    const searchKey = getSearchKey();

    const debounced = debounce((value: string) => {
      header.filters!.onApplyFilter([{ key: searchKey, value: value }]);
    }, 500);

    debounced(searchTerm);

    return () => {
      debounced.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className={`space-y-10 ${className}`}>
      <div className="flex items-center justify-between">
        <LeftControls
          isMobile={isMobileView}
          header={header}
          isLoading={isLoading}
          isRefetching={isRefetching}
          router={router}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          suggestions={suggestions}
          onSearchSuggestions={handleSearchSuggestions}
          isOpenColumnSettings={isOpenColumnSettings}
          setIsOpenColumnSettings={setIsOpenColumnSettings}
          hasActiveColumnSettings={hasActiveColumnSettings}
          hasFilters={hasFilters}
          hasActiveFilters={hasActiveFilters}
          handleResetFilters={handleResetFilters}
          isFilterVisible={isFilterVisible}
          setIsFilterVisible={setIsFilterVisible}
        />
        <RightControls
          isMobile={isMobileView}
          header={header}
          isLoading={isLoading}
          isRefetching={isRefetching}
          hasFilters={hasFilters}
          handleResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          hasActiveColumnSettings={hasActiveColumnSettings}
          setIsMobileOptionsOpen={setIsMobileOptionsOpen}
          queriesToInvalidate={queriesToInvalidate}
        />
      </div>

      {/* Desktop inline filter panel (always visible on desktop) */}
      {!isMobileView &&
        header.filters &&
        header.filters.fields &&
        isFilterVisible && (
          <div className="mt-4">
            <FilterList
              isMobile={isMobileView}
              form={formFilter}
              fields={header.filters?.fields || []}
              onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
              onReset={() =>
                header.filters?.onReset && header.filters.onReset()
              }
            />
          </div>
        )}

      {/* Mobile modal for filters / settings */}
      <Modal
        title="Tùy chọn"
        open={isMobileOptionsOpen}
        onCancel={() => setIsMobileOptionsOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div className="space-y-4">
          {header.searchInput && (
            header.searchInput.suggestions ? (
              <AutoComplete
                style={{ width: '100%' }}
                options={suggestions}
                onSearch={handleSearchSuggestions}
                onSelect={(value) => setSearchTerm(value)}
                value={searchTerm}
                onChange={(value) => setSearchTerm(value)}
                placeholder={header.searchInput.placeholder}
              >
                <Input prefix={<SearchOutlined />} allowClear />
              </AutoComplete>
            ) : (
              <Input
                value={searchTerm}
                placeholder={header.searchInput.placeholder}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            )
          )}

          {header.filters && header.filters.fields && (
            <FilterList
              isMobile={isMobileView}
              form={formFilter}
              onCancel={() => setIsMobileOptionsOpen(false)}
              fields={header.filters?.fields || []}
              onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
              onReset={() =>
                header.filters?.onReset && header.filters.onReset()
              }
            />
          )}
          <Divider className=" my-2" />

          {header.columnSettings && (
            <div>
              <div className=" flex  justify-between  items-center">
                <h3 className=" font-medium  mb-0">Cài đặt cột</h3>
                {header.columnSettings.onReset && (
                  <Button
                    disabled={isLoading || isRefetching}
                    type="link"
                    size="small"
                    onClick={() =>
                      header.columnSettings?.onReset &&
                      header.columnSettings.onReset()
                    }
                  >
                    Đặt lại
                  </Button>
                )}
              </div>
              <Divider className=" my-2" />
              <div className="grid grid-rows-5 grid-cols-2 justify-between gap-4">
                {header.columnSettings.columns.map((column) => (
                  <Checkbox
                    key={column.key}
                    checked={column.visible}
                    onChange={(e) => {
                      const newColumns = header.columnSettings!.columns.map(
                        (col) =>
                          col.key === column.key
                            ? { ...col, visible: e.target.checked }
                            : col
                      );
                      header.columnSettings!.onChange(newColumns);
                    }}
                  >
                    {column.title}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
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
