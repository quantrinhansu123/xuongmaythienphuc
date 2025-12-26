"use client";

import CommonTable from "@/components/CommonTable";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import WrapperContent from "@/components/WrapperContent";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
    CalendarOutlined,
    DownloadOutlined,
    MailOutlined,
    PhoneOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, DatePicker, Select, Statistic } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";

const { RangePicker } = DatePicker;

interface CustomerSummary {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

export default function CustomerDebtsPage() {
  const { can, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const { query, updateQueries, reset } = useFilter();
  const { exportToXlsx } = useFileExport([]);

  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "customer";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "all">("all");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  const { data: bankAccounts = [], isLoading: bankLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  const {
    data: customerSummaries = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["debts-summary", selectedBranchId, dateRange],
    queryFn: async () => {
      const branchParam =
        selectedBranchId !== "all" ? `&branchId=${selectedBranchId}` : "";
      const startDate = dateRange[0].format("YYYY-MM-DD");
      const endDate = dateRange[1].format("YYYY-MM-DD");
      const res = await fetch(
        `/api/finance/debts/summary?type=customers${branchParam}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 2 * 60 * 1000, // Cache
  });

  const handleExportExcel = () => {
    exportToXlsx(filteredCustomerSummaries, "debts-customers");
  };

  const handleResetAll = () => {
    setDateRange([dayjs().startOf("month"), dayjs()]);
    setSelectedBranchId("all");
    reset();
  };

  const handleViewPartnerDetails = (customer: CustomerSummary) => {
    setSelectedPartner({
      id: customer.id,
      name: customer.customerName,
      code: customer.customerCode,
      type: "customer",
      totalAmount: parseFloat(customer.totalAmount.toString()),
      paidAmount: parseFloat(customer.paidAmount.toString()),
      remainingAmount: parseFloat(customer.remainingAmount.toString()),
      totalOrders: customer.totalOrders,
      unpaidOrders: customer.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const columns = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
      fixed: "left" as const,
    },
    {
      title: "Liên hệ",
      dataIndex: "phone",
      key: "phone",
      width: 190,
      render: (_: unknown, record: CustomerSummary) => (
        <div className="text-gray-600">
          <div>
            <PhoneOutlined /> {record.phone}
          </div>
          {record.email && (
            <div className="text-xs">
              <MailOutlined /> {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Số ĐH",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 100,
      align: "left" as const,
      render: (_: unknown, record: CustomerSummary) => (
        <div>
          <div>{record.totalOrders} đơn</div>
          {record.unpaidOrders > 0 && (
            <div className="text-xs text-orange-600">
              {record.unpaidOrders} chưa TT
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      align: "right" as const,
      render: (value: unknown) =>
        `${parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 150,
      align: "right" as const,
      render: (value: unknown) => (
        <span className="text-green-600">
          {parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 150,
      align: "right" as const,
      render: (value: unknown) => (
        <span className="font-medium text-orange-700">
          {parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ
        </span>
      ),
    },

  ];

  const filteredCustomerSummaries = customerSummaries.filter(
    (c: CustomerSummary) => {
      // WrapperContent lưu search với key kết hợp các filterKeys
      const searchKey = "search,customerCode,customerName,phone";
      const searchValue = query[searchKey] || "";
      const matchSearch =
        !searchValue ||
        c.customerCode.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.phone?.includes(searchValue);

      const hasDebtValue = query["hasDebt"];
      const matchDebt =
        hasDebtValue === undefined ||
        (hasDebtValue === "true"
          ? c.remainingAmount > 0
          : c.remainingAmount === 0);

      return matchSearch && matchDebt;
    }
  );

  const totalReceivable = filteredCustomerSummaries.reduce(
    (sum: number, c: CustomerSummary) =>
      sum + parseFloat(c.remainingAmount?.toString() || "0"),
    0
  );

  return (
    <>
      <WrapperContent
        isRefetching={isFetching}
        title="Công nợ khách hàng"
        isNotAccessible={!can("sales.debts", "view")}
        isLoading={isLoading || branchesLoading || bankLoading}
        header={{
          refetchDataWithKeys: ["debts-summary"],
          customToolbar: (
            <div className="flex gap-3 items-center flex-wrap">
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD/MM/YYYY"
                placeholder={["Từ ngày", "Đến ngày"]}
                suffixIcon={<CalendarOutlined />}
                presets={[
                  { label: "Hôm nay", value: [dayjs(), dayjs()] },
                  { label: "Tuần này", value: [dayjs().startOf("week"), dayjs()] },
                  { label: "Tháng này", value: [dayjs().startOf("month"), dayjs()] },
                  {
                    label: "Tháng trước",
                    value: [
                      dayjs().subtract(1, "month").startOf("month"),
                      dayjs().subtract(1, "month").endOf("month"),
                    ],
                  },
                  {
                    label: "Quý này",
                    value: [dayjs().startOf("month").subtract(2, "month"), dayjs()],
                  },
                  { label: "Năm này", value: [dayjs().startOf("year"), dayjs()] },
                ]}
              />
              {isAdmin && (
                <Select
                  style={{ width: 200 }}
                  placeholder="Chọn chi nhánh"
                  value={selectedBranchId}
                  onChange={(value: number | "all") => setSelectedBranchId(value)}
                  options={[
                    { label: "Tất cả chi nhánh", value: "all" },
                    ...branches.map((b: Branch) => ({
                      label: b.branchName,
                      value: b.id,
                    })),
                  ]}
                />
              )}
            </div>
          ),
          buttonEnds: [
            {
              type: "default",
              name: "Đặt lại",
              onClick: handleResetAll,
              icon: <ReloadOutlined />,
            },
            {
              icon: <DownloadOutlined />,
              onClick: handleExportExcel,
              name: "Xuất Excel",
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã KH, tên, SĐT...",
            filterKeys: ["customerCode", "customerName", "phone"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "hasDebt",
                label: "Công nợ",
                options: [
                  { label: "Có công nợ", value: "true" },
                  { label: "Đã thanh toán", value: "false" },
                ],
              },
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
        }}
      >
        <div className="flex">
          <div className="flex-1">
            <div className="flex flex-col gap-4">
              {/* Summary */}
              <Card>
                <Statistic
                  title="Tổng phải thu"
                  value={totalReceivable}
                  suffix="đ"
                  styles={{
                    content: { color: "#52c41a" },
                  }}
                  formatter={(value) =>
                    `${Number(value).toLocaleString("vi-VN")}`
                  }
                />
                <div className="text-xs text-gray-600 mt-2">
                  {filteredCustomerSummaries.length} khách hàng
                </div>
              </Card>

              {/* Customer Summary Table */}
              <CommonTable
                columns={columns}
                dataSource={filteredCustomerSummaries}
                loading={
                  isLoading || branchesLoading || bankLoading || isFetching
                }
                paging={false}
                onRowClick={handleViewPartnerDetails}
              />
            </div>
          </div>

          {/* Side Panel */}
          {selectedPartner && (
            <PartnerDebtSidePanel
              partnerId={selectedPartner.id}
              partnerName={selectedPartner.name}
              partnerCode={selectedPartner.code}
              partnerType={selectedPartner.type}
              totalAmount={selectedPartner.totalAmount}
              paidAmount={selectedPartner.paidAmount}
              remainingAmount={selectedPartner.remainingAmount}
              totalOrders={selectedPartner.totalOrders}
              unpaidOrders={selectedPartner.unpaidOrders}
              bankAccounts={bankAccounts}
              canEdit={can("sales.debts", "edit")}
              open={showSidePanel}
              onClose={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
              }}
              onPaymentSuccess={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
                queryClient.invalidateQueries({ queryKey: ["debts-summary"] });
              }}
            />
          )}
        </div>
      </WrapperContent>
    </>
  );
}
