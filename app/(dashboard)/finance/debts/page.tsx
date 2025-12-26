"use client";

import Modal from "@/components/Modal";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import WrapperContent from "@/components/WrapperContent";
import { useFileExport } from "@/hooks/useFileExport";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";

interface Debt {
  id: number;
  debtCode: string;
  debtType: "RECEIVABLE" | "PAYABLE";
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierPhone?: string;
  referenceType?: string;
  referenceId?: number;
  notes: string;
  createdAt: string;
}

interface DebtPayment {
  id: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccountNumber?: string;
  bankName?: string;
  createdByName: string;
  notes: string;
  createdAt: string;
}

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

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  debtAmount: number;
}

interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  debtAmount: number;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

export default function DebtsPage() {
  const { can } = usePermissions();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>(
    []
  );
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummary[]>(
    []
  );
  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "customer" | "supplier";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">(
    "customers"
  );

  const [formData, setFormData] = useState({
    debtCode: "",
    customerId: "",
    supplierId: "",
    debtType: "RECEIVABLE" as "RECEIVABLE" | "PAYABLE",
    originalAmount: "",
    dueDate: "",
    notes: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    paymentAmount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH" as "CASH" | "BANK" | "TRANSFER",
    bankAccountId: "",
    notes: "",
  });

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchSuppliers();
    fetchBankAccounts();
    fetchCustomerSummaries();
    fetchSupplierSummaries();
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await fetch("/api/finance/debts");
      const data = await res.json();
      if (data.success) setDebts(data.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/sales/customers");
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/purchasing/suppliers");
      const data = await res.json();
      if (data.success) setSuppliers(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
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

  const fetchCustomerSummaries = async () => {
    try {
      const res = await fetch("/api/finance/debts/summary?type=customers");
      const data = await res.json();
      if (data.success) setCustomerSummaries(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchSupplierSummaries = async () => {
    try {
      const res = await fetch("/api/finance/debts/summary?type=suppliers");
      const data = await res.json();
      if (data.success) setSupplierSummaries(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleViewPartnerDetails = (
    partner: any,
    type: "customer" | "supplier"
  ) => {
    const name =
      type === "customer" ? partner.customerName : partner.supplierName;
    const code =
      type === "customer" ? partner.customerCode : partner.supplierCode;

    setSelectedPartner({
      id: partner.id,
      name,
      code,
      type,
      totalAmount: parseFloat(partner.totalAmount.toString()),
      paidAmount: parseFloat(partner.paidAmount.toString()),
      remainingAmount: parseFloat(partner.remainingAmount.toString()),
      totalOrders: partner.totalOrders,
      unpaidOrders: partner.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const fetchDebtPayments = async (debtId: number) => {
    try {
      const res = await fetch(`/api/finance/debts/${debtId}/payments`);
      const data = await res.json();
      if (data.success) setDebtPayments(data.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          originalAmount: parseFloat(formData.originalAmount),
          customerId: formData.customerId
            ? parseInt(formData.customerId)
            : null,
          supplierId: formData.supplierId
            ? parseInt(formData.supplierId)
            : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Tạo công nợ thành công!");
        setShowModal(false);
        resetForm();
        fetchDebts();
        fetchCustomers();
        fetchSuppliers();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Có lỗi xảy ra");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    try {
      const res = await fetch(
        `/api/finance/debts/${selectedDebt.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...paymentFormData,
            paymentAmount: parseFloat(paymentFormData.paymentAmount),
            bankAccountId: paymentFormData.bankAccountId
              ? parseInt(paymentFormData.bankAccountId)
              : null,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        alert("Thanh toán thành công!");
        resetPaymentForm();
        fetchDebts();
        fetchDebtPayments(selectedDebt.id);
        fetchCustomers();
        fetchSuppliers();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      alert("Có lỗi xảy ra");
    }
  };

  const handleSelectDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    fetchDebtPayments(debt.id);
    setShowSidePanel(true);
  };

  const resetForm = () => {
    setFormData({
      debtCode: "",
      customerId: "",
      supplierId: "",
      debtType: "RECEIVABLE",
      originalAmount: "",
      dueDate: "",
      notes: "",
    });
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      paymentAmount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
      bankAccountId: "",
      notes: "",
    });
  };

  const getCustomerDebts = (customerId: number) => {
    return debts.filter(
      (d) =>
        d.debtType === "RECEIVABLE" &&
        customers.find(
          (c) => c.id === customerId && c.customerName === d.customerName
        )
    );
  };

  const getSupplierDebts = (supplierId: number) => {
    return debts.filter(
      (d) =>
        d.debtType === "PAYABLE" &&
        suppliers.find(
          (s) => s.id === supplierId && s.supplierName === d.supplierName
        )
    );
  };

  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const handleResetAll = () => {
    setActiveTab("customers");
    setFilterQueries({});
    setSearchTerm("");
  };

  const customerExportColumns = [
    { title: 'Mã KH', dataIndex: 'customerCode', key: 'customerCode' },
    { title: 'Tên', dataIndex: 'customerName', key: 'customerName' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
    { title: 'Tổng đơn', dataIndex: 'totalOrders', key: 'totalOrders' },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount' },
    { title: 'Đã thanh toán', dataIndex: 'paidAmount', key: 'paidAmount' },
    { title: 'Còn nợ', dataIndex: 'remainingAmount', key: 'remainingAmount' },
  ];
  const supplierExportColumns = [
    { title: 'Mã NCC', dataIndex: 'supplierCode', key: 'supplierCode' },
    { title: 'Tên', dataIndex: 'supplierName', key: 'supplierName' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
    { title: 'Tổng đơn', dataIndex: 'totalOrders', key: 'totalOrders' },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount' },
    { title: 'Đã thanh toán', dataIndex: 'paidAmount', key: 'paidAmount' },
    { title: 'Còn nợ', dataIndex: 'remainingAmount', key: 'remainingAmount' },
  ];
  const { exportToXlsx: exportCustomers } = useFileExport(customerExportColumns);
  const { exportToXlsx: exportSuppliers } = useFileExport(supplierExportColumns);

  const handleExportExcel = () => {
    if (activeTab === 'customers') {
      exportCustomers(filteredCustomerSummaries, 'cong-no-khach-hang');
    } else {
      exportSuppliers(filteredSupplierSummaries, 'cong-no-nha-cung-cap');
    }
  };

  const filteredCustomerSummaries = customerSummaries.filter((c) => {
    const searchKey = "search,customerCode,customerName,phone";
    const searchValue = filterQueries[searchKey] || "";
    const matchSearch =
      !searchValue ||
      c.customerCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.phone?.includes(searchValue);

    const hasDebtValue = filterQueries["hasDebt"];
    const matchDebt =
      hasDebtValue === undefined ||
      (hasDebtValue === "true"
        ? c.remainingAmount > 0
        : c.remainingAmount === 0);

    return matchSearch && matchDebt;
  });

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

  const totalReceivable = filteredCustomerSummaries.reduce(
    (sum, c) => sum + parseFloat(c.remainingAmount?.toString() || "0"),
    0
  );
  const totalPayable = filteredSupplierSummaries.reduce(
    (sum, s) => sum + parseFloat(s.remainingAmount?.toString() || "0"),
    0
  );

  return (
    <>
      <WrapperContent
        title="Quản lý công nợ"
        isNotAccessible={!can("finance.debts", "view")}
        isLoading={loading}
        header={{
          buttonEnds: can("finance.debts", "create")
            ? [
              {
                type: "default",
                name: "Đặt lại",
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
              {
                type: "primary",
                name: "Thêm",
                onClick: () => {
                  resetForm();
                  setShowModal(true);
                },
                icon: <PlusOutlined />,
              },
              {
                type: "default",
                name: "Xuất Excel",
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
            ]
            : [
              {
                type: "default",
                name: "Đặt lại",
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
            ],
          searchInput: {
            placeholder:
              activeTab === "customers"
                ? "Tìm theo mã KH, tên, SĐT..."
                : "Tìm theo mã NCC, tên, SĐT...",
            filterKeys:
              activeTab === "customers"
                ? ["customerCode", "customerName", "phone"]
                : ["supplierCode", "supplierName", "phone"],
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
              setSearchTerm("");
            },
            query: filterQueries,
          },
        }}
      >
        <div className="flex">
          {/* Main Content */}
          <div
            className={`flex-1 transition-all duration-300 ${showSidePanel ? "mr-[600px]" : ""
              }`}
          >
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 mb-1">
                    Tổng phải thu (Khách hàng)
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {totalReceivable.toLocaleString("vi-VN")} đ
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {filteredCustomerSummaries.length} khách hàng
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600 mb-1">
                    Tổng phải trả (Nhà cung cấp)
                  </div>
                  <div className="text-2xl font-bold text-red-700">
                    {totalPayable.toLocaleString("vi-VN")} đ
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {filteredSupplierSummaries.length} nhà cung cấp
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab("customers")}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "customers"
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Khách hàng ({filteredCustomerSummaries.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("suppliers")}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === "suppliers"
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    Nhà cung cấp ({filteredSupplierSummaries.length})
                  </button>
                </div>
              </div>

              {/* Customer Summary Table */}
              {activeTab === "customers" && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Mã KH
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Khách hàng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Liên hệ
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số ĐH
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
                      {filteredCustomerSummaries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-8 text-center text-gray-500"
                          >
                            Không có khách hàng nào có đơn hàng
                          </td>
                        </tr>
                      ) : (
                        filteredCustomerSummaries.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {customer.customerCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="font-medium">
                                {customer.customerName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div>📞 {customer.phone}</div>
                              {customer.email && (
                                <div className="text-xs">
                                  ✉️ {customer.email}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <div>{customer.totalOrders} đơn</div>
                              {customer.unpaidOrders > 0 && (
                                <div className="text-xs text-orange-600">
                                  {customer.unpaidOrders} chưa TT
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {parseFloat(
                                customer.totalAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                              {parseFloat(
                                customer.paidAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-700">
                              {parseFloat(
                                customer.remainingAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() =>
                                  handleViewPartnerDetails(customer, "customer")
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Supplier Summary Table */}
              {activeTab === "suppliers" && (
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
                          <tr key={supplier.id} className="hover:bg-gray-50">
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
                                <div className="text-xs">
                                  ✉️ {supplier.email}
                                </div>
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
                              {parseFloat(
                                supplier.totalAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                              {parseFloat(
                                supplier.paidAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-700">
                              {parseFloat(
                                supplier.remainingAmount.toString()
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() =>
                                  handleViewPartnerDetails(supplier, "supplier")
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel - Partner Debt */}
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
            canEdit={can("finance.debts", "edit")}
            onClose={() => {
              setShowSidePanel(false);
              setSelectedPartner(null);
            }}
            onPaymentSuccess={() => {
              setShowSidePanel(false);
              setSelectedPartner(null);
              fetchCustomerSummaries();
              fetchSupplierSummaries();
            }}
          />

          {/* Create Debt Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              resetForm();
            }}
            title="Thêm công nợ"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mã công nợ *
                </label>
                <input
                  type="text"
                  value={formData.debtCode}
                  onChange={(e) =>
                    setFormData({ ...formData, debtCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Loại công nợ *
                </label>
                <select
                  value={formData.debtType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      debtType: e.target.value as any,
                      customerId: "",
                      supplierId: "",
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="RECEIVABLE">Phải thu (Khách hàng)</option>
                  <option value="PAYABLE">Phải trả (Nhà cung cấp)</option>
                </select>
              </div>

              {formData.debtType === "RECEIVABLE" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Khách hàng *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.debtType === "PAYABLE" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nhà cung cấp *
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplierName} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Số tiền *
                </label>
                <input
                  type="number"
                  value={formData.originalAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, originalAmount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Hạn thanh toán
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </WrapperContent>
    </>
  );
}
