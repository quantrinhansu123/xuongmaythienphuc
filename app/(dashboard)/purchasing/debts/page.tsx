"use client";

import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import WrapperContent from "@/components/WrapperContent";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/utils/format";
import { CalendarOutlined, DownloadOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { DatePicker, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";

const { RangePicker } = DatePicker;

interface SupplierSummary {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

export default function SupplierDebtsPage() {
  const { can, isAdmin } = usePermissions();
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummary[]>(
    []
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "all">(
    "all"
  );
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "supplier";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchBranches();
    fetchBankAccounts();
    fetchSupplierSummaries();
  }, []);

  useEffect(() => {
    fetchSupplierSummaries();
  }, [selectedBranchId, dateRange]);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchSupplierSummaries = async () => {
    setLoading(true);
    try {
      const branchParam =
        selectedBranchId !== "all" ? `&branchId=${selectedBranchId}` : "";
      const startDate = dateRange[0].format("YYYY-MM-DD");
      const endDate = dateRange[1].format("YYYY-MM-DD");
      const res = await fetch(
        `/api/finance/debts/summary?type=suppliers${branchParam}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      if (data.success) setSupplierSummaries(data.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setDateRange([dayjs().startOf("month"), dayjs()]);
    setSelectedBranchId("all");
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      if (data.success) setBankAccounts(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleViewPartnerDetails = (supplier: SupplierSummary) => {
    setSelectedPartner({
      id: supplier.id,
      name: supplier.supplierName,
      code: supplier.supplierCode,
      type: "supplier",
      totalAmount: parseFloat(supplier.totalAmount.toString()),
      paidAmount: parseFloat(supplier.paidAmount.toString()),
      remainingAmount: parseFloat(supplier.remainingAmount.toString()),
      totalOrders: supplier.totalOrders,
      unpaidOrders: supplier.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const filteredSupplierSummaries = supplierSummaries.filter((s) => {
    const searchKey = "search,supplierCode,supplierName,phone";
    const searchValue = filterQueries[searchKey] || "";
    const matchSearch =
      !searchValue ||
      s.supplierCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.supplierName.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.phone?.includes(searchValue);

    const hasDebtValue = filterQueries["hasDebt"];
    const matchDebt =
      hasDebtValue === undefined ||
      (hasDebtValue === "true"
        ? s.remainingAmount > 0
        : s.remainingAmount === 0);

    return matchSearch && matchDebt;
  });

  const totalPayable = filteredSupplierSummaries.reduce(
    (sum, s) => sum + parseFloat(s.remainingAmount?.toString() || "0"),
    0
  );

  return (
    <>
      <WrapperContent
        title="Công nợ nhà cung cấp"
        isNotAccessible={!can("purchasing.debts", "view")}
        isLoading={loading}
        header={{
          refetchDataWithKeys: ["debts", "suppliers"],
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
                    ...branches.map((b) => ({
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
              type: "default",
              name: "Nhập Excel",
              onClick: () => alert("Chức năng nhập Excel đang được phát triển"),
              icon: <UploadOutlined />,
            },
            {
              type: "default",
              name: "Xuất Excel",
              onClick: () => alert("Chức năng xuất Excel đang được phát triển"),
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã NCC, tên, SĐT...",
            filterKeys: ["supplierCode", "supplierName", "phone"],
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
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                newQueries[key] = value;
              });
              setFilterQueries(newQueries);
            },
            onReset: () => {
              setFilterQueries({});
            },
            query: filterQueries,
          },
        }}
      >
        <div className="flex">
          <div
            className={`flex-1 transition-all duration-300 ${showSidePanel ? "mr-[600px]" : ""
              }`}
          >
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <div className="text-sm text-red-600 mb-1">Tổng phải trả</div>
                <div className="text-3xl font-bold text-red-700">
                  {formatCurrency(totalPayable)}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {filteredSupplierSummaries.length} nhà cung cấp
                </div>
              </div>

              {/* Supplier Summary Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mã NCC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nhà cung cấp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Liên hệ
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Số ĐM
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Tổng tiền
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Đã trả
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Còn nợ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSupplierSummaries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          Không có nhà cung cấp nào có đơn mua
                        </td>
                      </tr>
                    ) : (
                      filteredSupplierSummaries.map((supplier) => (
                        <tr
                          key={supplier.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewPartnerDetails(supplier)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {supplier.supplierCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium">
                              {supplier.supplierName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div>📞 {supplier.phone}</div>
                            {supplier.email && (
                              <div className="text-xs">✉️ {supplier.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div>{supplier.totalOrders} đơn</div>
                            {supplier.unpaidOrders > 0 && (
                              <div className="text-xs text-orange-600">
                                {supplier.unpaidOrders} chưa TT
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {formatCurrency(supplier.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                            {formatCurrency(supplier.paidAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-700">
                            {formatCurrency(supplier.remainingAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {/* Removed button - click on row instead */}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <PartnerDebtSidePanel
            open={showSidePanel}
            partnerId={selectedPartner?.id}
            partnerName={selectedPartner?.name}
            partnerCode={selectedPartner?.code}
            partnerType={selectedPartner?.type}
            totalAmount={selectedPartner?.totalAmount}
            paidAmount={selectedPartner?.paidAmount}
            remainingAmount={selectedPartner?.remainingAmount}
            totalOrders={selectedPartner?.totalOrders}
            unpaidOrders={selectedPartner?.unpaidOrders}
            bankAccounts={bankAccounts}
            canEdit={can("purchasing.debts", "edit")}
            onClose={() => {
              setShowSidePanel(false);
              setSelectedPartner(null);
            }}
            onPaymentSuccess={() => {
              setShowSidePanel(false);
              setSelectedPartner(null);
              fetchSupplierSummaries();
            }}
          />
        </div>
      </WrapperContent>
    </>
  );
}
