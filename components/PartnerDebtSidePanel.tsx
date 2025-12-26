import { ExclamationCircleOutlined, HistoryOutlined, PrinterOutlined } from "@ant-design/icons";
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
}

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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

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
      form.setFieldsValue({ paymentAmount: order.remainingAmount.toString() });
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
      "_blank"
    );
  };

  const paymentMethodOptions = [
    { label: "Tiền mặt", value: "CASH" },
    { label: "Ngân hàng", value: "BANK" },
    { label: "Chuyển khoản", value: "TRANSFER" },
  ];

  const bankAccountOptions = bankAccounts.map((acc) => ({
    label: `${acc.bankName} - ${acc.accountNumber}`,
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
                            <span className="text-orange-600">{order.remainingAmount.toLocaleString("vi-VN")} đ</span>
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
                  placeholder={`Tối đa: ${(
                    paymentType === "order" && selectedOrderId
                      ? unpaidOrdersList.find(o => o.id === selectedOrderId)?.remainingAmount || 0
                      : remainingAmount || 0
                  ).toLocaleString("vi-VN")} đ`}
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
                      {amount.toLocaleString("vi-VN")} đ
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
    </Drawer>
  );
}
