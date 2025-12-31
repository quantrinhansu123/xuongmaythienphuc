import { formatCurrency, formatQuantity } from "@/utils/format";
import { ExclamationCircleOutlined, HistoryOutlined, PrinterOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Spin,
  Statistic,
  Table,
  Tag
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";

interface PaymentHistory {
  id: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
  bankAccountNumber: string;
  bankName: string;
  createdByName: string;
  createdAt: string;
  orderId: number;
  orderCode: string;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  accountName?: string;
  accountHolder?: string;
  accountType?: 'BANK' | 'CASH';
}

// Mapping bank shortName to VietQR bin code
const BANK_BIN_MAP: Record<string, string> = {
  'VCB': '970436',
  'TCB': '970407',
  'MB': '970422',
  'ACB': '970416',
  'BIDV': '970418',
  'VPB': '970432',
  'TPB': '970423',
  'STB': '970403',
  'HDB': '970437',
  'VIB': '970441',
  'SHB': '970443',
  'EIB': '970431',
  'MSB': '970426',
  'OCB': '970448',
  'ABB': '970425',
  'BAB': '970409',
  'NAB': '970428',
  'NCB': '970419',
  'PGB': '970430',
  'SCB': '970429',
  'SEAB': '970440',
  'VAB': '970427',
  'LPB': '970449',
  'KLB': '970452',
  'CAKE': '546034',
  'Ubank': '546035',
  'TIMO': '963388',
  'VTLMONEY': '971005',
  'VNPTMONEY': '971011',
  'VIETTEL': '963388',
};

interface Props {
  partnerId?: number;
  partnerName?: string;
  partnerCode?: string;
  partnerType?: "customer" | "supplier";
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  totalOrders?: number;
  unpaidOrders?: number;
  bankAccounts: BankAccount[];
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

interface PaymentFormValues {
  paymentAmount: string;
  paymentDate: dayjs.Dayjs;
  paymentMethod: "CASH" | "BANK" | "TRANSFER";
  bankAccountId?: string;
  notes?: string;
  paymentType: "all" | "order";
  orderId?: number;
}

interface UnpaidOrder {
  id: number;
  orderCode: string;
  orderDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  details?: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
}

export default function PartnerDebtSidePanel({
  partnerId,
  partnerName,
  partnerCode,
  partnerType,
  totalAmount,
  paidAmount,
  remainingAmount,
  totalOrders,
  unpaidOrders,
  bankAccounts,
  canEdit,
  open,
  onClose,
  onPaymentSuccess,
}: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [paymentType, setPaymentType] = useState<"all" | "order">("all");

  // Fetch company info for receipt
  const { data: companyInfo } = useQuery({
    queryKey: ["company-info-public"],
    queryFn: async () => {
      const res = await fetch("/api/public/company-info");
      const data = await res.json();
      return data.success ? data.data : { companyName: 'CỬA HÀNG', address: '', phone: '' };
    },
    staleTime: 60 * 60 * 1000, // Cache 1 hour
  });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{
    qrUrl: string;
    amount: number;
    accountNumber: string;
    bankName: string;
    accountHolder: string;
    description: string;
  } | null>(null);

  // Generate VietQR URL (only for customer payments)
  const generateVietQR = (account: BankAccount, amount: number) => {
    const bankBin = BANK_BIN_MAP[account.bankName] || account.bankName;
    const description = `TT CN ${partnerCode || partnerName}`;
    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${account.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(account.accountHolder || '')}`;
    return {
      qrUrl,
      amount,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      accountHolder: account.accountHolder || '',
      description,
    };
  };

  // Handle form value changes to generate QR
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // Only generate QR for customer payments
    if (partnerType !== 'customer') {
      setQrData(null);
      return;
    }

    const { bankAccountId, paymentAmount } = allValues;
    if (bankAccountId && paymentAmount) {
      const acc = bankAccounts.find(a => a.id === Number(bankAccountId));
      if (acc && acc.accountType === 'BANK') {
        const qr = generateVietQR(acc, parseFloat(paymentAmount));
        setQrData(qr);
      } else {
        setQrData(null);
      }
    } else {
      setQrData(null);
    }
  };

  // Fetch lịch sử thanh toán
  const { data: paymentHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["payment-history", partnerId, partnerType],
    queryFn: async () => {
      if (!partnerId) return [];
      const res = await fetch(`/api/finance/debts/partners/${partnerId}/history?type=${partnerType}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 30 * 60 * 1000, // Cache
    enabled: open && !!partnerId,
  });

  // Fetch danh sách đơn hàng chưa thanh toán
  const { data: unpaidOrdersList = [], isLoading: ordersLoading, refetch: refetchUnpaidOrders } = useQuery<UnpaidOrder[]>({
    queryKey: ["unpaid-orders", partnerId, partnerType],
    queryFn: async () => {
      if (!partnerId) return [];
      const endpoint = partnerType === "supplier"
        ? `/api/purchasing/orders?supplierId=${partnerId}&unpaidOnly=true`
        : `/api/sales/orders?customerId=${partnerId}&unpaidOnly=true`;
      const res = await fetch(endpoint);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: open && !!partnerId && paymentType === "order",
  });

  // Print thermal receipt (with or without QR) - moved after hooks
  const printThermalReceipt = () => {
    try {
      const formValues = form.getFieldsValue();
      const amount = parseFloat(formValues.paymentAmount || '0');
      const selectedAcc = bankAccounts.find(a => a.id === Number(formValues.bankAccountId));
      
      if (!amount || !selectedAcc) {
        console.log('Missing amount or account');
        return;
      }
      
      const printWindow = window.open('', '_blank', 'width=300,height=800');
      if (!printWindow) {
        console.log('Cannot open print window');
        return;
      }

      const isBankPayment = selectedAcc.accountType === 'BANK';
      const qrUrl = isBankPayment && qrData ? qrData.qrUrl : null;
      
      // Get selected order details if paying by order
      const selectedOrder = paymentType === 'order' && selectedOrderId 
        ? unpaidOrdersList.find(o => o.id === selectedOrderId) 
        : null;
      
      // Payment type label
      const paymentTypeLabel = paymentType === 'order' ? 'Thanh toán đơn hàng' : 'Trả công nợ';

      // Pre-format values for template
      const formattedAmount = formatCurrency(amount, 'đ');
      const formattedTotalAmount = formatCurrency(totalAmount || 0, 'đ');
      const formattedPaidAmount = formatCurrency(paidAmount || 0, 'đ');
      const formattedRemainingAmount = formatCurrency(remainingAmount || 0, 'đ');
      
      // Company info
      const shopName = companyInfo?.companyName || 'CỬA HÀNG';
      const shopAddress = companyInfo?.address || '';
      const shopPhone = companyInfo?.phone || '';

      // Build order section HTML
      let orderSectionHtml = '';
      if (selectedOrder) {
        const formattedOrderTotal = formatCurrency(selectedOrder.totalAmount, 'đ');
        const formattedOrderPaid = formatCurrency(selectedOrder.paidAmount, 'đ');
        const formattedOrderRemaining = formatCurrency(selectedOrder.remainingAmount, 'đ');
        const orderDateStr = dayjs(selectedOrder.orderDate).format('DD/MM/YYYY');
        
        // Build items HTML
        let itemsHtml = '';
        if (selectedOrder.details && selectedOrder.details.length > 0) {
          itemsHtml = selectedOrder.details.map((item) => {
            const qty = formatQuantity(item.quantity);
            const price = formatCurrency(item.unitPrice, '');
            const total = formatCurrency(item.totalAmount, '');
            return '<div class="item-row"><div class="item-name">' + item.itemName + '</div><div class="item-detail"><span>' + qty + ' x ' + price + '</span><span class="item-total">' + total + '</span></div></div>';
          }).join('');
        }
        
        orderSectionHtml = '<div class="divider"></div>' +
          '<div class="row"><span>Mã đơn:</span><span class="bold">' + selectedOrder.orderCode + '</span></div>' +
          '<div class="row"><span>Ngày đặt:</span><span>' + orderDateStr + '</span></div>' +
          (itemsHtml ? '<div class="divider"></div><div class="bold" style="margin-bottom: 4px;">CHI TIẾT ĐƠN HÀNG</div>' + itemsHtml : '') +
          '<div class="divider"></div>' +
          '<div class="summary-row"><span>Tổng tiền đơn:</span><span>' + formattedOrderTotal + '</span></div>' +
          '<div class="summary-row"><span>Đã thanh toán:</span><span>' + formattedOrderPaid + '</span></div>' +
          '<div class="summary-row"><span>Còn lại:</span><span>' + formattedOrderRemaining + '</span></div>';
      } else {
        orderSectionHtml = '<div class="divider"></div>' +
          '<div class="summary-row"><span>Tổng công nợ:</span><span>' + formattedTotalAmount + '</span></div>' +
          '<div class="summary-row"><span>Đã thanh toán:</span><span>' + formattedPaidAmount + '</span></div>' +
          '<div class="summary-row"><span>Còn nợ:</span><span>' + formattedRemainingAmount + '</span></div>';
      }

      // Build QR/Cash section
      let paymentInfoHtml = '';
      if (qrUrl) {
        paymentInfoHtml = '<div class="divider"></div>' +
          '<div class="center bold">QUÉT MÃ QR ĐỂ THANH TOÁN</div>' +
          '<div class="qr-container"><img src="' + qrUrl + '" alt="QR Code" /></div>' +
          '<div class="small">' +
          '<div class="row"><span>Ngân hàng:</span><span>' + selectedAcc.bankName + '</span></div>' +
          '<div class="row"><span>Số TK:</span><span>' + selectedAcc.accountNumber + '</span></div>' +
          '<div class="row"><span>Chủ TK:</span><span>' + (selectedAcc.accountHolder || '') + '</span></div>' +
          '<div class="row"><span>Nội dung CK:</span><span>TT CN ' + (partnerCode || partnerName) + '</span></div>' +
          '</div>';
      } else {
        paymentInfoHtml = '<div class="divider"></div>' +
          '<div class="small"><div class="row"><span>Quỹ tiền mặt:</span><span>' + (selectedAcc.accountName || selectedAcc.accountNumber) + '</span></div></div>';
      }

      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu thu công nợ</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Courier New", monospace; width: 80mm; padding: 3mm; font-size: 11px; line-height: 1.3; }' +
        '.center { text-align: center; }' +
        '.bold { font-weight: bold; }' +
        '.divider { border-top: 1px dashed #000; margin: 6px 0; }' +
        '.row { display: flex; justify-content: space-between; margin: 2px 0; }' +
        '.qr-container { text-align: center; margin: 8px 0; }' +
        '.qr-container img { max-width: 180px; height: auto; }' +
        '.title { font-size: 14px; font-weight: bold; margin-bottom: 6px; }' +
        '.shop-name { font-size: 16px; font-weight: bold; }' +
        '.amount { font-size: 16px; font-weight: bold; }' +
        '.small { font-size: 9px; color: #666; }' +
        '.highlight { background: #f0f0f0; padding: 4px; margin: 4px 0; }' +
        '.item-row { margin: 4px 0; }' +
        '.item-name { font-size: 11px; }' +
        '.item-detail { display: flex; justify-content: space-between; font-size: 10px; color: #333; }' +
        '.item-total { font-weight: bold; }' +
        '.summary-row { display: flex; justify-content: space-between; margin: 3px 0; }' +
        '@media print { body { width: 80mm; } @page { size: 80mm auto; margin: 0; } }' +
        '</style></head><body>' +
        '<div class="center shop-name">' + shopName + '</div>' +
        (shopAddress ? '<div class="center small">' + shopAddress + '</div>' : '') +
        (shopPhone ? '<div class="center small">ĐT: ' + shopPhone + '</div>' : '') +
        '<div class="divider"></div>' +
        '<div class="center title">PHIẾU THU CÔNG NỢ</div>' +
        '<div class="divider"></div>' +
        '<div class="row"><span>Khách hàng:</span><span class="bold">' + partnerName + '</span></div>' +
        '<div class="row"><span>Mã KH:</span><span>' + (partnerCode || '-') + '</span></div>' +
        '<div class="row"><span>Ngày:</span><span>' + new Date().toLocaleString('vi-VN') + '</span></div>' +
        '<div class="row"><span>Loại TT:</span><span class="bold">' + paymentTypeLabel + '</span></div>' +
        '<div class="row"><span>Hình thức:</span><span>' + (isBankPayment ? 'Chuyển khoản' : 'Tiền mặt') + '</span></div>' +
        orderSectionHtml +
        '<div class="highlight"><div class="row"><span class="bold">SỐ TIỀN THU:</span><span class="amount">' + formattedAmount + '</span></div></div>' +
        paymentInfoHtml +
        '<div class="divider"></div>' +
        '<div class="center small">Cảm ơn quý khách!</div>' +
        '<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>' +
        '</body></html>';
      
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  const handlePaymentTypeChange = (type: "all" | "order") => {
    setPaymentType(type);
    setSelectedOrderId(null);
    if (type === "all") {
      form.setFieldsValue({ paymentAmount: (remainingAmount || 0).toString() });
    } else {
      form.setFieldsValue({ paymentAmount: "" });
    }
  };

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrderId(orderId);
    const order = unpaidOrdersList.find(o => o.id === orderId);
    if (order) {
      form.setFieldsValue({ paymentAmount: (order.remainingAmount || 0).toString() });
    }
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    if (!partnerId || !partnerType) return;

    try {
      const res = await fetch(
        `/api/finance/debts/partners/${partnerId}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            paymentAmount: parseFloat(values.paymentAmount),
            bankAccountId: values.bankAccountId
              ? parseInt(values.bankAccountId)
              : null,
            partnerType,
            orderId: paymentType === "order" ? selectedOrderId : null,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        message.success("Thanh toán thành công!");

        // Đóng drawer và refresh data từ parent
        onClose();
        onPaymentSuccess();
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Payment error:", err);
      message.error("Có lỗi xảy ra");
    }
  };

  const handlePrintDebtStatement = () => {
    if (!partnerId || !partnerType) return;
    window.open(
      `/api/finance/debts/partners/${partnerId}/pdf?type=${partnerType}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const paymentMethodOptions = [
    { label: "Tiền mặt", value: "CASH" },
    { label: "Ngân hàng", value: "BANK" },
    { label: "Chuyển khoản", value: "TRANSFER" },
  ];

  const bankAccountOptions = bankAccounts.map((acc) => ({
    label: `${acc.accountName || acc.accountHolder || acc.bankName} - ${acc.accountNumber}`,
    value: acc.id,
  }));

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg font-semibold">
            Công nợ - {partnerName || "N/A"}
          </div>
          <div className="text-sm text-gray-500">{partnerCode || "N/A"}</div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={600}
      destroyOnHidden
    >
      <div className="flex flex-col gap-6">
        {/* Summary */}
        <Card
          title="Tổng hợp công nợ"
          extra={
            <Button
              type="primary"
              ghost
              icon={<PrinterOutlined />}
              onClick={handlePrintDebtStatement}
            >
              In bảng kê
            </Button>
          }
        >
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Statistic
              title="Tổng tiền"
              value={totalAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#1890ff" } }}
            />
            <Statistic
              title="Đã trả"
              value={paidAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#52c41a" } }}
            />
            <Statistic
              title="Còn nợ"
              value={remainingAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#fa8c16" } }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 pt-4 border-t">
            <span>
              Tổng số {partnerType === "customer" ? "đơn hàng" : "đơn mua"}:{" "}
              <span className="font-medium text-gray-900">
                {totalOrders || 0}
              </span>
            </span>
            {(unpaidOrders || 0) > 0 && (
              <span className="text-orange-600">
                Chưa thanh toán:{" "}
                <span className="font-medium">{unpaidOrders}</span>
              </span>
            )}
          </div>
        </Card>

        {/* Payment Form */}
        {canEdit && (remainingAmount || 0) > 0 && (
          <Card title="Thanh toán công nợ">
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePaymentSubmit}
              onValuesChange={handleFormValuesChange}
              initialValues={{
                paymentAmount: (remainingAmount || 0).toString(),
                paymentDate: dayjs(),
                paymentMethod: "CASH",
                bankAccountId: "",
                notes: "",
                paymentType: "all",
              }}
            >
              {/* Chọn loại thanh toán */}
              <Form.Item label="Loại thanh toán" name="paymentType">
                <Radio.Group
                  onChange={(e) => handlePaymentTypeChange(e.target.value as "all" | "order")}
                  value={paymentType}
                >
                  <Radio.Button value="all">Thanh toán chung</Radio.Button>
                  <Radio.Button value="order">Theo đơn hàng</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Chọn đơn hàng nếu thanh toán theo đơn */}
              {paymentType === "order" && (
                <Form.Item label="Chọn đơn hàng" required>
                  {ordersLoading ? (
                    <Spin size="small" />
                  ) : unpaidOrdersList.length === 0 ? (
                    <div className="text-gray-500 text-sm">Không có đơn hàng chưa thanh toán</div>
                  ) : (
                    <Select
                      placeholder="-- Chọn đơn hàng --"
                      value={selectedOrderId}
                      onChange={handleOrderSelect}
                      options={unpaidOrdersList.map(order => ({
                        label: (
                          <div className="flex justify-between">
                            <span>{order.orderCode} - {dayjs(order.orderDate).format("DD/MM/YYYY")}</span>
                            <span className="text-orange-600">{formatCurrency(order.remainingAmount || 0, 'đ')}</span>
                          </div>
                        ),
                        value: order.id,
                      }))}
                    />
                  )}
                </Form.Item>
              )}

              <Form.Item
                label="Số tiền thanh toán"
                name="paymentAmount"
                rules={[{ required: true, message: "Vui lòng nhập số tiền" }]}
              >
                <Input
                  type="number"
                  min={0}
                  max={paymentType === "order" && selectedOrderId
                    ? unpaidOrdersList.find(o => o.id === selectedOrderId)?.remainingAmount || 0
                    : remainingAmount || 0
                  }
                  step={0.01}
                  suffix="đ"
                  placeholder={`Tối đa: ${formatCurrency(
                    paymentType === "order" && selectedOrderId
                      ? unpaidOrdersList.find(o => o.id === selectedOrderId)?.remainingAmount || 0
                      : remainingAmount || 0
                  , 'đ')}`}
                />
              </Form.Item>

              <Form.Item
                label="Ngày thanh toán"
                name="paymentDate"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>

              <Form.Item
                label="Tài khoản thanh toán"
                name="bankAccountId"
                rules={[
                  { required: true, message: "Vui lòng chọn tài khoản" },
                ]}
              >
                <Select
                  options={bankAccountOptions}
                  placeholder="-- Chọn tài khoản --"
                />
              </Form.Item>

              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea
                  rows={3}
                  placeholder="Ghi chú về khoản thanh toán này..."
                />
              </Form.Item>

              {/* QR Code for customer bank payments */}
              {partnerType === 'customer' && qrData && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border text-center">
                  <div className="text-sm font-medium mb-2">Mã QR thanh toán</div>
                  <img 
                    src={qrData.qrUrl} 
                    alt="QR Payment" 
                    className="mx-auto max-w-[160px] cursor-pointer"
                    onClick={() => setQrModalOpen(true)}
                  />
                  <div className="text-xs text-gray-500 mt-1">Nhấn để phóng to</div>
                </div>
              )}

              {/* Print button - always show for customers when account selected */}
              {partnerType === 'customer' && (
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const hasAccount = getFieldValue('bankAccountId');
                    const hasAmount = parseFloat(getFieldValue('paymentAmount') || '0') > 0;
                    return hasAccount && hasAmount ? (
                      <div className="mb-4 text-center">
                        <Button 
                          icon={<PrinterOutlined />}
                          onClick={printThermalReceipt}
                        >
                          In phiếu thu
                        </Button>
                      </div>
                    ) : null;
                  }}
                </Form.Item>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  disabled={paymentType === "order" && !selectedOrderId}
                >
                  Xác nhận thanh toán
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        {remainingAmount === 0 && (
          <Card>
            <div className="text-center py-8">
              <div className="text-green-600 text-lg mb-2">
                ✓ Đã thanh toán đủ
              </div>
              <div className="text-gray-600">
                {partnerType === "customer" ? "Khách hàng" : "Nhà cung cấp"} này
                không còn công nợ
              </div>
            </div>
          </Card>
        )}

        {/* Lịch sử thanh toán */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <HistoryOutlined />
              <span>Lịch sử thanh toán</span>
            </div>
          }
        >
          {historyLoading ? (
            <div className="text-center py-4">
              <Spin />
            </div>
          ) : paymentHistory.length === 0 ? (
            <Empty description="Chưa có lịch sử thanh toán" />
          ) : (
            <Table
              dataSource={paymentHistory}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5, size: "small" }}
              columns={[
                {
                  title: "Ngày",
                  dataIndex: "paymentDate",
                  key: "paymentDate",
                  width: 100,
                  render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
                },
                {
                  title: "Số tiền",
                  dataIndex: "paymentAmount",
                  key: "paymentAmount",
                  width: 120,
                  align: "right" as const,
                  render: (amount: number) => (
                    <span className="text-green-600 font-medium">
                      {formatCurrency(amount, 'đ')}
                    </span>
                  ),
                },
                {
                  title: "Hình thức",
                  dataIndex: "paymentMethod",
                  key: "paymentMethod",
                  width: 100,
                  render: (method: string) => {
                    const methodMap: Record<string, { label: string; color: string }> = {
                      CASH: { label: "Tiền mặt", color: "green" },
                      BANK: { label: "Ngân hàng", color: "blue" },
                      TRANSFER: { label: "Chuyển khoản", color: "purple" },
                    };
                    const m = methodMap[method] || { label: method, color: "default" };
                    return <Tag color={m.color}>{m.label}</Tag>;
                  },
                },
                {
                  title: "Người thực hiện",
                  dataIndex: "createdByName",
                  key: "createdByName",
                  width: 120,
                  ellipsis: true,
                },
              ]}
              expandable={{
                expandedRowRender: (record: PaymentHistory) => (
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <strong>Thời gian:</strong>{" "}
                      {dayjs(record.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </div>
                    {record.orderCode && (
                      <div>
                        <strong>Đơn hàng:</strong> {record.orderCode}
                      </div>
                    )}
                    {record.bankName && (
                      <div>
                        <strong>Tài khoản:</strong> {record.bankName} - {record.bankAccountNumber}
                      </div>
                    )}
                    {record.notes && (
                      <div>
                        <strong>Ghi chú:</strong> {record.notes}
                      </div>
                    )}
                  </div>
                ),
              }}
            />
          )}
        </Card>

        {/* Info */}
        <Card>
          <div className="text-sm">
            <div className="font-medium mb-2 flex items-center gap-2">
              <ExclamationCircleOutlined />
              Lưu ý:
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
              <li>Số tiền thanh toán sẽ được ghi vào sổ quỹ</li>
              <li>Công nợ sẽ tự động giảm sau khi thanh toán</li>
              <li>Nếu thanh toán qua ngân hàng, số dư TK sẽ được cập nhật</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* QR Code Modal */}
      {partnerType === 'customer' && (
        <Modal
          open={qrModalOpen}
          onCancel={() => setQrModalOpen(false)}
          footer={[
            <Button key="print" icon={<PrinterOutlined />} onClick={printThermalReceipt}>
              In phiếu thu
            </Button>,
            <Button key="close" onClick={() => setQrModalOpen(false)}>
              Đóng
            </Button>
          ]}
          title={<span><QrcodeOutlined /> Mã QR thanh toán công nợ</span>}
          centered
        >
          {qrData && (
            <div className="text-center space-y-4">
              <img 
                src={qrData.qrUrl} 
                alt="QR Payment" 
                className="mx-auto max-w-[280px]"
              />
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(qrData.amount, 'đ')}
              </div>
              <div className="bg-gray-50 p-3 rounded text-left text-sm space-y-1">
                <div><strong>Khách hàng:</strong> {partnerName}</div>
                <div><strong>Ngân hàng:</strong> {qrData.bankName}</div>
                <div><strong>Số TK:</strong> {qrData.accountNumber}</div>
                <div><strong>Chủ TK:</strong> {qrData.accountHolder}</div>
                <div><strong>Nội dung:</strong> {qrData.description}</div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Drawer>
  );
}
