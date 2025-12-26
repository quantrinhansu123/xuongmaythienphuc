"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { formatCurrency, formatQuantity } from "@/utils/format";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  UploadOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tag,
  Typography
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";

const { RangePicker } = DatePicker;

// Define interfaces
interface OrderItem {
  itemId?: number;
  materialId?: number;
  itemName: string;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalAmount: number;
  notes: string;
  measurements?: { attributeId: number; attributeName?: string; value: string }[];
  [key: string]: unknown; // Allow dynamic property access
}

interface CategoryAttribute {
  id: number;
  category_id: number;
  attribute_name: string;
  attribute_type: string;
  is_required: boolean;
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  groupName?: string;
  priceMultiplier?: number;
  debtAmount: number;
  isActive: boolean;
  createdAt: string;
}

interface Order {
  id: number;
  orderCode: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  depositAmount?: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
  details?: OrderItem[];

}


interface MaterialSuggestion {
  materialId: number;
  materialCode: string;
  materialName: string;
  totalNeeded: number;
  unit: string;
  currentStock: number;
  needToImport: number;
  items?: {
    itemName?: string;
    productName?: string;
    quantity: number;
    materialPerItem?: number;
    bomQuantity?: number;
  }[];
}

// Order Detail Drawer Component
interface OrderDetailDrawerProps {
  orderId: number | null;
  canEdit: boolean;
  onUpdateStatus: (id: number, status: string, paymentData?: { paymentAmount: number; paymentMethod: string; bankAccountId?: number }) => void;
  onExportOrder: (order: Order) => void;
}

function OrderDetailDrawer({
  orderId,
  canEdit,
  onUpdateStatus,
  onExportOrder,
}: OrderDetailDrawerProps) {
  const [paymentForm] = Form.useForm();
  const [remainingPaymentForm] = Form.useForm();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [stockByWarehouse, setStockByWarehouse] = useState<any[]>([]);
  const [needsProduction, setNeedsProduction] = useState<boolean | null>(null);

  // Fetch order detail using TanStack Query
  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await fetch(`/api/sales/orders/${orderId}`);
      const data = await res.json();
      return data.success ? data.data : null;
    },
    staleTime: 2 * 60 * 1000, // Cache
    enabled: !!orderId,
  });

  // Fetch tài khoản cho thanh toán - lọc theo chi nhánh của đơn hàng
  const { data: paymentAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-active", orderData?.branchId],
    queryFn: async () => {
      const branchParam = orderData?.branchId ? `&branchId=${orderData.branchId}` : '';
      const res = await fetch(`/api/finance/bank-accounts?isActive=true${branchParam}`);
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: !!orderData?.branchId,
  });

  // Check if order needs production
  const checkIfOrderNeedsProduction = () => {
    if (!orderData?.details) return false;

    // Check if any item has measurements (custom order)
    const hasMeasurements = orderData.details.some((d: any) =>
      d.measurements && Array.isArray(d.measurements) && d.measurements.length > 0
    );

    if (hasMeasurements) return true;

    // Check stock availability - if all items have enough stock in store warehouses, no production needed
    if (stockByWarehouse.length > 0) {
      const storeWarehouses = stockByWarehouse.filter((w: any) =>
        w.warehouseType === 'THANH_PHAM' || w.warehouseType === 'HON_HOP'
      );

      if (storeWarehouses.length > 0) {
        const allItemsAvailable = storeWarehouses.some((w: any) => w.canFulfill);
        if (allItemsAvailable) return false;
      }
    }

    // Default: assume needs production if we can't determine
    return true;
  };

  // Fetch stock availability across all warehouses
  useEffect(() => {
    if (orderData?.details && orderData.details.length > 0) {
      fetch('/api/inventory/check-stock-all-warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderData.details.map((d: any) => ({
            productId: d.productId,
            materialId: d.materialId,
            quantity: d.quantity,
          }))
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStockByWarehouse(data.data || []);
          }
        })
        .catch(err => console.error('Error checking stock:', err));
    }
  }, [orderData]);

  // Update needsProduction when stock data changes
  useEffect(() => {
    if (orderData && stockByWarehouse.length > 0) {
      setNeedsProduction(checkIfOrderNeedsProduction());
    } else if (orderData) {
      setNeedsProduction(checkIfOrderNeedsProduction());
    }
  }, [orderData, stockByWarehouse]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Chờ thanh toán",
      PAID: "Đã thanh toán",
      MEASUREMENTS_COMPLETED: "Đã nhập thông số",
      WAITING_MATERIAL: "Chờ nguyên liệu",
      IN_PRODUCTION: "Đang sản xuất",
      READY_TO_EXPORT: "Chờ xuất kho",
      EXPORTED: "Đã xuất kho",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Alert title="Có lỗi xảy ra khi tải dữ liệu" type="error" showIcon />
      </div>
    );
  }

  const data = orderData;

  return (
    <Space vertical size="large" style={{ width: "100%" }}>
      {/* Thông tin đơn hàng */}
      <Card title="Thông tin đơn hàng" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Mã đơn">
            <Typography.Text code>{data.orderCode}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag
              color={
                data.status === "PENDING"
                  ? "orange"
                  : data.status === "CONFIRMED"
                    ? "blue"
                    : data.status === "WAITING_MATERIAL"
                      ? "orange"
                      : data.status === "IN_PRODUCTION"
                        ? "purple"
                        : data.status === "READY_TO_EXPORT"
                          ? "cyan"
                          : data.status === "EXPORTED"
                            ? "blue"
                            : data.status === "COMPLETED"
                              ? "green"
                              : "red"
              }
            >
              {getStatusText(data.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            {data.customerName}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày đặt">
            {new Date(data.orderDate).toLocaleDateString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Người tạo">
            {data.createdBy}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            <Typography.Text strong style={{ color: '#1890ff' }}>
              {formatCurrency(data.finalAmount)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tiền đặt cọc">
            <Typography.Text style={{ color: (data.depositAmount || 0) > 0 ? '#52c41a' : '#999' }}>
              {formatCurrency(data.depositAmount || 0)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">
            <Typography.Text style={{ color: '#52c41a' }}>
              {formatCurrency(data.paidAmount || 0)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Còn lại">
            <Typography.Text strong style={{
              color: (data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0)) > 0 ? '#ff4d4f' : '#52c41a'
            }}>
              {formatCurrency(data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0))}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái TT">
            <Tag color={
              data.paymentStatus === 'PAID' ? 'green' :
                data.paymentStatus === 'PARTIAL' ? 'orange' : 'red'
            }>
              {data.paymentStatus === 'PAID' ? 'Đã thanh toán' :
                data.paymentStatus === 'PARTIAL' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        {data.notes && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text strong>Ghi chú:</Typography.Text> {data.notes}
          </div>
        )}

      </Card>

      {/* Tiến trình đơn hàng */}
      {
        data.status !== "CANCELLED" && (
          <Card title="Tiến trình đơn hàng" size="small">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              {/* Bước 1: Chờ xác nhận */}
              <div
                className={`flex items-start gap-3 ${data.status === "PENDING" ? "opacity-100" : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${data.status === "PENDING"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  1
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Chờ xác nhận</Typography.Text>
                  <div className="text-xs text-gray-500">
                    Đơn hàng đang chờ xác nhận từ quản lý
                  </div>
                </div>
              </div>

              {/* Bước 2: Thanh toán */}
              <div
                className={`flex items-start gap-3 ${[
                  "CONFIRMED",
                  "PAID",
                  "MEASUREMENTS_COMPLETED",
                  "COMPLETED",
                ].includes(data.status)
                  ? "opacity-100"
                  : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${[
                    "CONFIRMED",
                    "PAID",
                    "MEASUREMENTS_COMPLETED",
                    "COMPLETED",
                  ].includes(data.status)
                    ? "bg-purple-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  2
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Thanh toán</Typography.Text>
                  <div className="text-xs text-gray-500">
                    {data.paymentStatus === "PAID"
                      ? "Đã thanh toán đủ"
                      : data.paymentStatus === "PARTIAL"
                        ? "Đã thanh toán một phần"
                        : "Chưa thanh toán"}
                  </div>
                  {data.status === "CONFIRMED" && canEdit && (() => {
                    const remainingAmount = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                    return remainingAmount > 0;
                  })() && (
                      <div style={{ marginTop: 8, padding: 12, background: '#f0f5ff', borderRadius: 6 }}>
                        <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          💰 Thanh toán
                        </Typography.Text>
                        <Form
                          form={paymentForm}
                          size="small"
                          onFinish={(values) => {
                            const acc = paymentAccounts.find((a: any) => a.id === values.bankAccountId);
                            onUpdateStatus(data.id, 'PAID', {
                              paymentAmount: values.paymentAmount,
                              paymentMethod: acc?.accountType === 'CASH' ? 'CASH' : 'BANK',
                              bankAccountId: values.bankAccountId
                            });
                            paymentForm.resetFields();
                          }}
                        >
                          <Form.Item name="paymentAmount" rules={[{ required: true, message: 'Nhập số tiền' }]} style={{ marginBottom: 8 }}>
                            <InputNumber
                              placeholder="Nhập số tiền"
                              min={0}
                              max={data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0)}
                              style={{ width: '100%' }}
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                            />
                          </Form.Item>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              const remaining = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                              paymentForm.setFieldsValue({ paymentAmount: remaining });
                            }}
                            style={{ marginTop: -8, marginBottom: 8, padding: 0 }}
                          >
                            Thanh toán toàn bộ: {formatCurrency(data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0))}
                          </Button>
                          <Form.Item name="bankAccountId" rules={[{ required: true, message: 'Chọn tài khoản nhận tiền' }]} style={{ marginBottom: 8 }}>
                            <Select placeholder="Chọn tài khoản nhận tiền">
                              {paymentAccounts.map((acc: any) => (
                                <Select.Option key={acc.id} value={acc.id}>
                                  {acc.accountType === 'CASH' ? '💵' : '🏦'} {acc.accountNumber} - {acc.bankName}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Button type="primary" htmlType="submit" size="small" block>
                            Xác nhận thanh toán
                          </Button>
                        </Form>
                      </div>
                    )}
                </div>
              </div>

              {/* Bước 3: Nhập thông số & Sản xuất */}
              <div
                className={`flex items-start gap-3 ${[
                  "PAID",
                  "IN_PRODUCTION",
                  "READY_TO_EXPORT",
                  "EXPORTED",
                  "COMPLETED",
                ].includes(data.status)
                  ? "opacity-100"
                  : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${[
                    "PAID",
                    "IN_PRODUCTION",
                    "READY_TO_EXPORT",
                    "EXPORTED",
                    "COMPLETED",
                  ].includes(data.status)
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  3
                </div>
                <div className="flex-1">
                  <Typography.Text strong>
                    {needsProduction === false ? "Đơn hàng có sẵn" : "Nhập thông số & Sản xuất"}
                  </Typography.Text>
                  <div className="text-xs text-gray-500">
                    {needsProduction === false
                      ? "Đơn hàng có sẵn tại kho - Sẵn sàng xuất kho"
                      : data.status === "PAID"
                        ? "Nhập thông số để tạo đơn sản xuất"
                        : data.status === "IN_PRODUCTION"
                          ? "Đang sản xuất"
                          : "Đã hoàn thành"}
                  </div>
                  {data.status === "PAID" && canEdit && needsProduction !== false && (
                    <Space style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          window.location.href = `/sales/orders/${data.id}/measurements`;
                        }}
                      >
                        Nhập thông số & Tạo đơn SX
                      </Button>
                      <Button
                        size="small"
                        type="default"
                        onClick={() => {
                          onUpdateStatus(data.id, "READY_TO_EXPORT");
                        }}
                      >
                        Bỏ qua
                      </Button>
                    </Space>
                  )}
                  {data.status === "PAID" && canEdit && needsProduction === false && (() => {
                    const remainingAmount = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                    return remainingAmount === 0 || data.paymentStatus === 'PAID';
                  })() && (
                      <Button
                        size="small"
                        type="primary"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          onUpdateStatus(data.id, "READY_TO_EXPORT");
                        }}
                      >
                        Bỏ qua
                      </Button>
                    )}
                  {data.status === "IN_PRODUCTION" && canEdit && (
                    <Button
                      size="small"
                      type="default"
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        onUpdateStatus(data.id, "READY_TO_EXPORT");
                      }}
                    >
                      Bỏ qua
                    </Button>
                  )}
                </div>
              </div>

              {/* Bước 4: Xuất kho */}
              <div
                className={`flex items-start gap-3 ${["READY_TO_EXPORT", "EXPORTED", "COMPLETED"].includes(data.status)
                  ? "opacity-100"
                  : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${["READY_TO_EXPORT", "EXPORTED", "COMPLETED"].includes(data.status)
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  4
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Xuất kho</Typography.Text>
                  <div className="text-xs text-gray-500">
                    {data.status === "READY_TO_EXPORT"
                      ? "Sẵn sàng xuất kho"
                      : data.status === "EXPORTED" || data.status === "COMPLETED"
                        ? "Đã xuất kho"
                        : "Chờ xuất kho"}
                  </div>
                  {data.status === "READY_TO_EXPORT" && canEdit && (() => {
                    const remainingAmount = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                    return remainingAmount;
                  })() > 0 && (
                      <div style={{ marginTop: 8, padding: 12, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                        <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#d46b08' }}>
                          ⚠️ Cần thanh toán phần còn lại trước khi xuất kho
                        </Typography.Text>
                        <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          Còn lại: <strong>{formatCurrency(data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0))}</strong>
                        </Typography.Text>
                        <Form
                          form={remainingPaymentForm}
                          size="small"
                          onFinish={(values) => {
                            const acc = paymentAccounts.find((a: any) => a.id === values.bankAccountId);
                            onUpdateStatus(data.id, data.status, {
                              paymentAmount: values.paymentAmount,
                              paymentMethod: acc?.accountType === 'CASH' ? 'CASH' : 'BANK',
                              bankAccountId: values.bankAccountId
                            });
                            remainingPaymentForm.resetFields();
                          }}
                        >
                          <Form.Item name="paymentAmount" rules={[{ required: true, message: 'Nhập số tiền' }]} style={{ marginBottom: 8 }}>
                            <InputNumber
                              placeholder="Nhập số tiền"
                              min={0}
                              max={data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0)}
                              style={{ width: '100%' }}
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                            />
                          </Form.Item>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              const remaining = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                              remainingPaymentForm.setFieldsValue({ paymentAmount: remaining });
                            }}
                            style={{ marginTop: -8, marginBottom: 8, padding: 0 }}
                          >
                            Thanh toán toàn bộ: {formatCurrency(data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0))}
                          </Button>
                          <Form.Item name="bankAccountId" rules={[{ required: true, message: 'Chọn tài khoản nhận tiền' }]} style={{ marginBottom: 8 }}>
                            <Select placeholder="Chọn tài khoản nhận tiền">
                              {paymentAccounts.map((acc: any) => (
                                <Select.Option key={acc.id} value={acc.id}>
                                  {acc.accountType === 'CASH' ? '💵' : '🏦'} {acc.accountNumber} - {acc.bankName}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Button type="primary" htmlType="submit" size="small" block>
                            Thanh toán phần còn lại
                          </Button>
                        </Form>
                      </div>
                    )}
                  {data.status === "READY_TO_EXPORT" && canEdit && (() => {
                    const remainingAmount = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
                    return remainingAmount === 0 || data.paymentStatus === 'PAID';
                  })() && (
                      <Button
                        onClick={() => onExportOrder(data)}
                        size="small"
                        type="primary"
                        style={{ marginTop: 8 }}
                        block
                      >
                        → Xuất kho
                      </Button>
                    )}
                </div>
              </div>

              {/* Bước 5: Hoàn thành */}
              <div
                className={`flex items-start gap-3 ${["EXPORTED", "COMPLETED"].includes(data.status)
                  ? "opacity-100"
                  : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${["EXPORTED", "COMPLETED"].includes(data.status)
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  5
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Hoàn thành</Typography.Text>
                  <div className="text-xs text-gray-500">
                    {data.status === "COMPLETED"
                      ? "Đơn hàng đã hoàn thành"
                      : "Đã xuất kho - Chờ hoàn thành"}
                  </div>
                  {data.status === "EXPORTED" && canEdit && (
                    <Button
                      onClick={() => {
                        onUpdateStatus(data.id, "COMPLETED");
                      }}
                      size="small"
                      type="primary"
                      style={{ marginTop: 8 }}
                      block
                    >
                      → Hoàn thành
                    </Button>
                  )}
                </div>
              </div>

            </Space>
          </Card>
        )
      }



      {/* Danh sách sản phẩm */}
      <Card title="Danh sách sản phẩm" size="small">
        <Table<OrderItem>
          columns={[
            {
              title: "STT",
              key: "index",
              width: 60,
              render: (_, __, index: number) => index + 1,
            },
            {
              title: "Hàng hóa",
              dataIndex: "itemName",
              key: "itemName",
              width: 200,
            },
            {
              title: "SL",
              dataIndex: "quantity",
              key: "quantity",
              width: 80,
              align: "right" as const,
              render: (value: number) => formatQuantity(value),
            },
            {
              title: "Đơn giá",
              dataIndex: "unitPrice",
              key: "unitPrice",
              width: 120,
              align: "right" as const,
              render: (value: number) => formatCurrency(value, ""),
            },
            {
              title: "Thành tiền",
              dataIndex: "totalAmount",
              key: "totalAmount",
              width: 120,
              align: "right" as const,
              render: (value: number) => (
                <Typography.Text strong>
                  {formatCurrency(value, "")}
                </Typography.Text>
              ),
            },
          ]}
          dataSource={data.details || []}
          rowKey={(record, index) => `item-${index}`}
          pagination={false}
          size="small"
          scroll={{ x: true }}
          expandable={{
            expandedRowRender: (record) => (
              record.measurements && record.measurements.length > 0 ? (
                <div className="p-2 bg-gray-50 rounded">
                  <Typography.Text strong className="text-xs text-gray-500 mb-1 block">Thông số:</Typography.Text>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {record.measurements.map((m: any, idx: number) => (
                      <div key={idx} className="text-xs">
                        <span className="text-gray-600">{m.attributeName}:</span> <span className="font-medium">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ),
            rowExpandable: (record) => !!(record.measurements && record.measurements.length > 0),
          }}
        />
        <div className="mt-4 space-y-2 text-right">
          <div>
            <Typography.Text>Tổng tiền:</Typography.Text>{" "}
            <Typography.Text strong>
              {formatCurrency(data.totalAmount)}
            </Typography.Text>
          </div>
          {data.discountAmount > 0 && (
            <div className="text-red-600">
              <Typography.Text>
                Giảm giá: -{formatCurrency(data.discountAmount)}
              </Typography.Text>
            </div>
          )}
          <div className="text-lg font-bold text-blue-600">
            <Typography.Text>
              Thành tiền: {formatCurrency(data.finalAmount)}
            </Typography.Text>
          </div>
        </div>
      </Card>

      {/* Kiểm tra tồn kho */}
      {stockByWarehouse.length > 0 && (
        <Card title="Kiểm tra tồn kho" size="small">
          <Table
            dataSource={stockByWarehouse}
            rowKey="warehouseId"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Kho',
                key: 'warehouse',
                render: (_: any, record: any) => (
                  <div>
                    <div className="font-medium">{record.warehouseName}</div>
                    <div className="text-xs text-gray-500">{record.branchName}</div>
                  </div>
                ),
              },
              {
                title: 'Trạng thái',
                key: 'status',
                align: 'center' as const,
                render: (_: any, record: any) => {
                  const isEnough = record.canFulfill;
                  return isEnough ? (
                    <Tag color="green">✓ Đủ hàng</Tag>
                  ) : (
                    <Tag color="red">✗ Thiếu hàng</Tag>
                  );
                },
              },
              {
                title: 'Chi tiết',
                key: 'details',
                render: (_: any, record: any) => (
                  <div className="text-xs space-y-1">
                    {record.items?.map((item: any, idx: number) => (
                      <div key={idx} className={item.available >= item.required ? 'text-green-600' : 'text-red-600'}>
                        {item.itemName}: {formatQuantity(item.available)}/{formatQuantity(item.required)}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Space
        style={{
          width: "100%",
          justifyContent: "flex-end",
          borderTop: "1px solid #f0f0f0",
          paddingTop: 16,
        }}
      >
        <Button
          onClick={() =>
            window.open(`/api/sales/orders/${data.id}/pdf`, "_blank")
          }
          icon={<span>🖨️</span>}
        >
          In PDF
        </Button>
        {data.status === "PENDING" && canEdit && (
          <>
            <Button danger onClick={() => onUpdateStatus(data.id, "CANCELLED")}>
              ✗ Hủy đơn
            </Button>
            <Button
              type="primary"
              onClick={() => onUpdateStatus(data.id, "CONFIRMED")}
            >
              ✓ Xác nhận đơn
            </Button>
          </>
        )}
        {data.status === "PAID" && canEdit && needsProduction !== false && (
          <Button
            type="primary"
            onClick={() => window.location.href = `/sales/orders/${data.id}/measurements`}
          >
            → Nhập thông số
          </Button>
        )}
        {data.status === "READY_TO_EXPORT" && canEdit && (() => {
          const remainingAmount = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
          return remainingAmount === 0 || data.paymentStatus === 'PAID';
        })() && (
            <Button
              type="primary"
              onClick={() => onExportOrder(data)}
              icon={<span>📦</span>}
            >
              Xuất kho
            </Button>
          )}
        {data.status === "EXPORTED" && canEdit && (
          <Button
            type="primary"
            onClick={() => onUpdateStatus(data.id, "COMPLETED")}
            icon={<CheckCircleOutlined />}
          >
            Hoàn thành
          </Button>
        )}
      </Space>
    </Space >
  );
}

interface ExportModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ExportModal({ order, onClose, onSuccess }: ExportModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [checkingStock, setCheckingStock] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  useEffect(() => {
    if (order) {
      // Reset form và state khi order thay đổi
      form.resetFields();
      setSelectedWarehouseId(null);
      setStockData({});

      // showAll=true để xem tất cả kho của tất cả chi nhánh
      fetch('/api/inventory/warehouses?showAll=true')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWarehouses(data.data);
            if (data.data.length === 1) {
              const whId = data.data[0].id;
              form.setFieldsValue({ warehouseId: whId });
              setSelectedWarehouseId(whId);
            }
          }
        })
        .catch(err => {
          console.error('Error fetching warehouses:', err);
          message.error('Lỗi khi tải danh sách kho');
        });
    } else {
      // Reset khi đóng modal
      form.resetFields();
      setSelectedWarehouseId(null);
      setStockData({});
      setWarehouses([]);
    }
  }, [order, form, message]);

  useEffect(() => {
    if (selectedWarehouseId && order?.details) {
      setCheckingStock(true);
      fetch('/api/inventory/check-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          items: order.details.map(item => ({
            productId: item.productId,
            materialId: item.materialId
          }))
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const stockMap: Record<string, number> = {};
            data.data.forEach((item: any) => {
              const key = item.productId ? `p-${item.productId}` : `m-${item.materialId}`;
              stockMap[key] = item.quantity;
            });
            setStockData(stockMap);
          }
        })
        .catch(err => {
          console.error('Error checking stock:', err);
          message.error('Lỗi khi kiểm tra tồn kho');
        })
        .finally(() => setCheckingStock(false));
    } else {
      setStockData({});
    }
  }, [selectedWarehouseId, order, message]);

  const handleExport = async (values: any) => {
    if (!order) return;

    // Check if payment is complete
    const remainingAmount = order.finalAmount - (order.depositAmount || 0) - (order.paidAmount || 0);
    if (remainingAmount > 0) {
      message.error(`Đơn hàng còn thiếu ${formatCurrency(remainingAmount)}. Vui lòng thanh toán trước khi xuất kho.`);
      return;
    }

    setLoading(true);
    try {
      const exportRes = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: values.warehouseId,
          notes: `Xuất kho cho đơn hàng ${order.orderCode} - KH: ${order.customerName}`,
          relatedOrderCode: order.orderCode,
          relatedCustomerName: order.customerName,
          items: order.details?.map(item => ({
            productId: item.productId || undefined,
            materialId: item.materialId || undefined,
            quantity: item.quantity,
            notes: item.notes
          }))
        })
      });
      const exportData = await exportRes.json();

      if (!exportData.success) {
        message.error(exportData.error || 'Lỗi khi tạo phiếu xuất');
        setLoading(false);
        return;
      }

      const statusRes = await fetch(`/api/sales/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EXPORTED' })
      });
      const statusData = await statusRes.json();

      if (statusData.success) {
        message.success('Đã xuất kho thành công');
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        message.error(statusData.error || 'Lỗi khi cập nhật trạng thái đơn hàng');
        setLoading(false);
      }

    } catch (error) {
      console.error('Export error:', error);
      message.error('Có lỗi xảy ra khi xuất kho');
      setLoading(false);
    }
  };

  const remainingAmount = order ? order.finalAmount - (order.depositAmount || 0) - (order.paidAmount || 0) : 0;

  return (
    <Modal
      title="Tạo phiếu xuất kho"
      open={!!order}
      onCancel={() => {
        form.resetFields();
        setSelectedWarehouseId(null);
        setStockData({});
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      {remainingAmount > 0 && (
        <Alert
          message="Cảnh báo"
          description={`Đơn hàng còn thiếu ${formatCurrency(remainingAmount)}. Vui lòng thanh toán trước khi xuất kho.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleExport}>
        <Form.Item
          name="warehouseId"
          label="Chọn kho xuất"
          rules={[{ required: true, message: 'Vui lòng chọn kho' }]}
        >
          <Select
            placeholder="Chọn kho"
            onChange={(val) => setSelectedWarehouseId(val)}
            showSearch
            optionFilterProp="children"
          >
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>
                {w.warehouseName} - {w.branchName} ({w.warehouseType === 'THANH_PHAM' ? 'Thành phẩm' : w.warehouseType === 'NVL' ? 'NVL' : 'Hỗn hợp'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Typography.Text strong>Danh sách hàng hóa:</Typography.Text>
            {checkingStock && <Spin size="small" />}
          </div>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            {order?.details?.map((item, idx) => {
              const key = item.productId ? `p-${item.productId}` : `m-${item.materialId}`;
              const stock = stockData[key] || 0;
              const isEnough = stock >= item.quantity;

              return (
                <li key={idx} className="text-sm">
                  <div className="flex justify-between items-center">
                    <span>{item.itemName}</span>
                    <div className="flex gap-3">
                      <span>SL: <strong>{formatQuantity(item.quantity)}</strong></span>
                      {selectedWarehouseId && (
                        <span className={isEnough ? "text-green-600" : "text-red-600 font-bold"}>
                          (Tồn: {formatQuantity(stock)})
                          {!isEnough && " ⚠️ Thiếu"}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={remainingAmount > 0}
          >
            Xuất kho
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [exportOrder, setExportOrder] = useState<Order | null>(null);
  const handleExportOrder = (order: Order) => setExportOrder(order);
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Define default columns for useColumn hook
  const defaultColumns: TableColumnsType<Order> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      width: 120,
      fixed: "left" as const,
      render: (value: string) => <span className="font-mono">{value}</span>,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 150,
      render: (text: string) => text || "-",
    },
    {
      title: "Ngày đặt",
      dataIndex: "orderDate",
      key: "orderDate",
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString("vi-VN"),
    },
    {
      title: "Tổng tiền",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 140,
      align: "right" as const,
      render: (value: number) => (
        <span className="font-semibold">{formatCurrency(value)}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded text-xs ${value === "PENDING"
            ? "bg-yellow-100 text-yellow-800"
            : value === "CONFIRMED"
              ? "bg-blue-100 text-blue-800"
              : value === "PAID"
                ? "bg-purple-100 text-purple-800"
                : value === "MEASUREMENTS_COMPLETED"
                  ? "bg-indigo-100 text-indigo-800"
                  : value === "IN_PRODUCTION"
                    ? "bg-orange-100 text-orange-800"
                    : value === "READY_TO_EXPORT"
                      ? "bg-cyan-100 text-cyan-800"
                      : value === "EXPORTED"
                        ? "bg-teal-100 text-teal-800"
                        : value === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
            }`}
        >
          {getStatusText(value)}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record: Order) => (
        <TableActions
          extraActions={[
            {
              title: "Xác nhận",
              icon: <CheckCircleOutlined />,
              onClick: () => updateStatus(record.id, "CONFIRMED"),
              can: record.status === "PENDING" && can("sales.orders", "edit"),
            },
          ]}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Modal and form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewBOM, setPreviewBOM] = useState<MaterialSuggestion[]>([]);
  const [showPreviewBOM, setShowPreviewBOM] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [branches, setBranches] = useState<{ id: number; branchName: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "all">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "all">("all");
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const { modal } = App.useApp();

  // Form and mutation hooks
  const [form] = Form.useForm();
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: (data) => {
      message.success(
        `Tạo đơn hàng thành công! Mã đơn: ${data.data.orderCode}`
      );
      setShowCreateModal(false);
      form.resetFields();
      setOrderItems([]);
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
      setDiscountAmount(0);
      setDiscountPercent(0);
      setDepositAmount(0);
      setDepositAccountId(null);
      setDepositMethod('CASH');
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentAmount, paymentMethod, bankAccountId }: { id: number; status: string; paymentAmount?: number; paymentMethod?: string; bankAccountId?: number }) => {
      const res = await fetch(`/api/sales/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentAmount, paymentMethod, bankAccountId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: (_, variables) => {
      message.success("Cập nhật thành công");

      // The drawer will automatically refresh due to query invalidation
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-active"] });
      queryClient.invalidateQueries({ queryKey: ["debts-summary"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Form states
  const [orderForm, setOrderForm] = useState({
    customerId: "",
    orderDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositAccountId, setDepositAccountId] = useState<number | null>(null);
  const [depositMethod, setDepositMethod] = useState<string>('CASH');

  // Quick item creation state
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemForm] = Form.useForm();
  const [savingItem, setSavingItem] = useState(false);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<number | null>(null); // track which dropdown is open by index

  // TanStack Query for data fetching
  // Fetch current user and branches
  const { data: currentUserData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.user);
        return data.data.user;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // Cache
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
        return data.data;
      }
      return [];
    },
    staleTime: 10 * 60 * 1000, // Cache
  });

  const isAdmin = currentUserData?.roleCode === "ADMIN";

  const {
    data: orders = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["orders", SuperJSON.stringify(query), dateRange?.[0]?.format("YYYY-MM-DD"), dateRange?.[1]?.format("YYYY-MM-DD"), selectedBranchId, selectedCustomerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.search) params.append("search", query.search);
      if (query.status) params.append("status", query.status);
      if (selectedCustomerId !== "all") params.append("customerId", selectedCustomerId.toString());
      if (dateRange?.[0]) params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
      if (dateRange?.[1]) params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      if (selectedBranchId !== "all") params.append("branchId", selectedBranchId.toString());

      const res = await fetch("/api/sales/orders?" + params.toString());
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 30 * 60 * 1000, // Cache
    enabled: can("sales.orders", "view") && !!dateRange?.[0] && !!dateRange?.[1],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 30 * 60 * 1000, // Cache
    enabled: can("sales.orders", "create"),
  });

  // Fetch tài khoản (ngân hàng + tiền mặt)
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: can("sales.orders", "create"),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items", "sellable"],
    queryFn: async () => {
      // Chỉ lấy những sản phẩm có thể bán
      const res = await fetch("/api/products/items?sellable=true");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 5 * 60 * 1000, // Cache
    enabled: can("sales.orders", "create"),
  });

  // Fetch item categories for quick item creation
  const { data: itemCategories = [] } = useQuery({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/item-categories");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    staleTime: 10 * 60 * 1000, // Cache
    enabled: showNewItemModal,
  });

  // Quick item creation handler
  const handleCreateQuickItem = async () => {
    try {
      const values = await newItemForm.validateFields();
      setSavingItem(true);

      const res = await fetch("/api/products/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          isSellable: true, // Luôn true vì tạo từ đơn hàng
        }),
      });
      const data = await res.json();

      if (data.success) {
        message.success(`Đã tạo hàng hoá: ${data.data.itemName}`);
        queryClient.invalidateQueries({ queryKey: ["items"] });

        // Tự động thêm hàng hóa vừa tạo vào đơn hàng
        const newItem = data.data;
        const basePrice = newItem.costPrice || 0;
        const discountPercent = selectedCustomer?.priceMultiplier || 0;
        const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));

        setOrderItems([
          {
            itemId: newItem.id,
            itemName: newItem.itemName,
            productId: undefined,
            productName: "",
            quantity: 1,
            unitPrice,
            costPrice: basePrice,
            totalAmount: unitPrice,
            notes: "",
          },
          ...orderItems,
        ]);

        setShowNewItemModal(false);
        newItemForm.resetFields();
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      // validation error
    } finally {
      setSavingItem(false);
    }
  };

  const handleCreateOrder = () => {
    setOrderForm({
      customerId: "",
      orderDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
      notes: "",
    });
    setOrderItems([]);
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
    setDiscountAmount(0);
    setDiscountPercent(0);
    setDepositAmount(0);
    setDepositAccountId(null);
    setDepositMethod('CASH');
    setSelectedCustomer(null);
    form.setFieldsValue({
      customerId: undefined,
      discountAmount: 0,
      discountPercent: 0,
      depositAmount: 0,
      orderDate: new Date().toLocaleDateString('en-CA'),
    });
    setShowCreateModal(true);
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === "NEW") {
      setShowNewCustomer(true);
      setSelectedCustomer(null);
      setOrderForm({ ...orderForm, customerId: "" });
      return;
    }

    setShowNewCustomer(false);
    const customer = Array.isArray(customers)
      ? customers.find((c) => c.id === parseInt(customerId))
      : null;
    setSelectedCustomer(customer);
    setOrderForm({ ...orderForm, customerId });

    // Cập nhật giá cho các items đã có
    if (customer && orderItems.length > 0 && Array.isArray(items)) {
      const updatedItems = orderItems.map((item) => {
        const foundItem = items.find((i) => i.id === item.itemId);
        if (foundItem) {
          const basePrice = foundItem.costPrice || 0;
          const discountPercent = customer.priceMultiplier || 0;
          const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));
          return { ...item, unitPrice, totalAmount: item.quantity * unitPrice };
        }
        return item;
      });
      setOrderItems(updatedItems);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      {
        itemId: undefined,
        itemName: "",
        productId: undefined,
        productName: "",
        quantity: 1,
        unitPrice: 0,
        costPrice: 0,
        totalAmount: 0,
        notes: "",
      },
      ...orderItems,
    ]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: unknown) => {
    const newItems = [...orderItems];

    if (field === "itemId") {
      // Sử dụng items (hàng hoá) thay vì products
      const item = Array.isArray(items)
        ? items.find((i) => i.id === parseInt(String(value)))
        : null;
      if (item) {
        const basePrice = item.costPrice || 0;
        const discountPercent = selectedCustomer?.priceMultiplier || 0;
        const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));

        newItems[index] = {
          ...newItems[index],
          itemId: item.id,
          itemName: item.itemName,
          unitPrice,
          costPrice: basePrice,
          totalAmount: newItems[index].quantity * unitPrice,
        };
      }
    } else if (field === "productId") {
      // Giữ lại để tương thích ngược
      // Removed products reference
    } else if (field === "quantity") {
      const qty = parseInt(String(value)) || 0;
      newItems[index].quantity = qty;
      newItems[index].totalAmount = qty * newItems[index].unitPrice;
    } else if (field === "unitPrice") {
      const price = parseFloat(String(value)) || 0;
      newItems[index].unitPrice = price;
      newItems[index].totalAmount = newItems[index].quantity * price;
    } else {
      newItems[index][field] = value;
    }

    setOrderItems(newItems);
  };

  const updateItemMeasurement = (itemIndex: number, attributeId: number, value: string) => {
    const newItems = [...orderItems];
    const item = newItems[itemIndex];
    if (!item.measurements) item.measurements = [];

    const existingIdx = item.measurements.findIndex(m => m.attributeId === attributeId);
    if (existingIdx >= 0) {
      item.measurements[existingIdx].value = value;
    } else {
      item.measurements.push({ attributeId, value });
    }
    setOrderItems(newItems);
  };

  // Cache for category attributes
  const [categoryAttributes, setCategoryAttributes] = useState<Record<number, CategoryAttribute[]>>({});

  const fetchCategoryAttributes = async (categoryId: number) => {
    if (categoryAttributes[categoryId]) return categoryAttributes[categoryId];
    try {
      const res = await fetch(`/api/categories/${categoryId}/attributes`);
      const data = await res.json();
      if (data.success) {
        setCategoryAttributes(prev => ({ ...prev, [categoryId]: data.data }));
        return data.data;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  useEffect(() => {
    // Fetch attributes for items when they are added/changed
    orderItems.forEach(async (item) => {
      if (item.itemId) {
        const foundItem = items.find((i: any) => i.id === item.itemId);
        if (foundItem?.categoryId) {
          await fetchCategoryAttributes(foundItem.categoryId);
        }
      }
    });
  }, [orderItems, items]);

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    // Kiểm tra khách hàng - có thể là khách hàng mới hoặc đã có
    if (!orderForm.customerId && !showNewCustomer) {
      alert("Vui lòng chọn khách hàng hoặc thêm khách hàng mới");
      return;
    }

    if (showNewCustomer && !newCustomer.customerName) {
      alert("Vui lòng nhập tên khách hàng mới");
      return;
    }

    if (orderItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 hàng hoá");
      return;
    }

    // Kiểm tra items - ưu tiên itemId, fallback productId
    if (
      orderItems.some(
        (item) => (!item.itemId && !item.productId) || item.quantity <= 0
      )
    ) {
      alert("Vui lòng kiểm tra thông tin hàng hoá");
      return;
    }

    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: orderForm.customerId
            ? parseInt(orderForm.customerId)
            : null,
          newCustomer: showNewCustomer ? newCustomer : null,
          orderDate: form.getFieldValue('orderDate') || orderForm.orderDate,
          notes: orderForm.notes,
          discountAmount: form.getFieldValue('discountAmount') || 0,
          depositAmount: form.getFieldValue('depositAmount') || 0,
          depositAccountId: depositAccountId,
          depositMethod: depositMethod,
          items: orderItems.map((item) => ({
            itemId: item.itemId || null,
            productId: item.productId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            notes: item.notes,
            measurements: item.measurements,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success(
          `Tạo đơn hàng thành công! Mã đơn: ${data.data.orderCode}`
        );
        setShowCreateModal(false);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["items"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      message.error("Có lỗi xảy ra");
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Chờ thanh toán",
      PAID: "Đã thanh toán",
      MEASUREMENTS_COMPLETED: "Đã nhập thông số",
      WAITING_MATERIAL: "Chờ nguyên liệu",
      IN_PRODUCTION: "Đang sản xuất",
      READY_TO_EXPORT: "Chờ xuất kho",
      EXPORTED: "Đã xuất kho",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  const updateStatus = (id: number, status: string, paymentData?: { paymentAmount: number; paymentMethod: string; bankAccountId?: number }) => {
    if (paymentData) {
      updateStatusMutation.mutate({ id, status, ...paymentData });
      return;
    }

    modal.confirm({
      title: `Cập nhật trạng thái đơn hàng`,
      content: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang "${getStatusText(
        status
      )}"?`,
      onOk: () => {
        updateStatusMutation.mutate({ id, status });
      },
    });
  };
  // Tính định mức NVL preview khi tạo đơn hàng
  const loadPreviewBOM = async () => {
    if (orderItems.length === 0) {
      setPreviewBOM([]);
      return;
    }

    try {
      // Lấy BOM cho các sản phẩm trong đơn hàng
      const productItems = orderItems.filter(item => {
        const foundItem = items.find((i: { id: number; itemType: string }) => i.id === item.itemId);
        return foundItem?.itemType === 'PRODUCT';
      });

      const materialItems = orderItems.filter(item => {
        const foundItem = items.find((i: { id: number; itemType: string }) => i.id === item.itemId);
        return foundItem?.itemType === 'MATERIAL';
      });

      const bomList: MaterialSuggestion[] = [];

      // Lấy BOM cho sản phẩm
      for (const item of productItems) {
        const foundItem = items.find((i: { id: number; productId?: number }) => i.id === item.itemId);
        if (foundItem?.productId) {
          try {
            const res = await fetch(`/api/products/${foundItem.productId}/bom`);
            const data = await res.json();
            if (data.success && data.data) {
              for (const bom of data.data) {
                const existing = bomList.find(b => b.materialId === bom.materialId);
                const neededQty = (bom.quantity || 0) * (item.quantity || 1);
                if (existing) {
                  existing.totalNeeded += neededQty;
                } else {
                  bomList.push({
                    materialId: bom.materialId,
                    materialCode: bom.materialCode,
                    materialName: bom.materialName,
                    unit: bom.unit,
                    totalNeeded: neededQty,
                    currentStock: 0,
                    needToImport: neededQty,
                    items: [{
                      productName: item.itemName || foundItem.itemName,
                      quantity: item.quantity || 1,
                      bomQuantity: bom.quantity
                    }]
                  });
                }
              }
            }
          } catch (e) {
            console.error('Error fetching BOM:', e);
          }
        }
      }

      // Thêm NVL được bán trực tiếp (chính nó là định mức)
      for (const item of materialItems) {
        const foundItem = items.find((i: { id: number; materialId?: number; itemCode: string; itemName: string; unit: string }) => i.id === item.itemId);
        if (foundItem?.materialId) {
          const existing = bomList.find(b => b.materialId === foundItem.materialId);
          const neededQty = item.quantity || 1;
          if (existing) {
            existing.totalNeeded += neededQty;
          } else {
            bomList.push({
              materialId: foundItem.materialId,
              materialCode: foundItem.itemCode,
              materialName: foundItem.itemName,
              unit: foundItem.unit,
              totalNeeded: neededQty,
              currentStock: 0,
              needToImport: neededQty,
              items: [{
                productName: `${foundItem.itemName} (bán trực tiếp)`,
                quantity: neededQty,
                bomQuantity: 1
              }]
            });
          }
        }
      }

      setPreviewBOM(bomList);
      if (bomList.length > 0) {
        setShowPreviewBOM(true);
      }
    } catch (e) {
      console.error('Error loading preview BOM:', e);
    }
  };

  // In phiếu xuất kho NVL
  const printBOMSheet = () => {
    if (previewBOM.length === 0) {
      message.warning('Không có định mức NVL để in');
      return;
    }

    const printContent = `
      <html>
      <head>
        <title>Phiếu xuất kho NVL</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { text-align: center; width: 200px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>PHIẾU XUẤT KHO NGUYÊN VẬT LIỆU</h1>
        <p><strong>Ngày:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã NVL</th>
              <th>Tên NVL</th>
              <th>ĐVT</th>
              <th class="text-right">Số lượng cần</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${previewBOM.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.materialCode}</td>
                <td>${item.materialName}</td>
                <td>${item.unit}</td>
                <td class="text-right">${item.totalNeeded}</td>
                <td>${item.items?.map(i => i.productName).join(', ') || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div class="signature">
            <p>Người lập phiếu</p>
            <br/><br/><br/>
            <p>_______________</p>
          </div>
          <div class="signature">
            <p>Thủ kho</p>
            <br/><br/><br/>
            <p>_______________</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Apply client-side filtering
  const filteredOrders = applyFilter(orders as Order[]);

  const { exportToXlsx } = useFileExport(getVisibleColumns());

  const handleExportExcel = () => {
    exportToXlsx(filteredOrders, "don-hang");
  };

  const handleImportExcel = () => {
    alert("Chức năng nhập Excel đang được phát triển");
  };

  const handleResetAll = () => {
    reset();
    setDateRange([dayjs().startOf("month"), dayjs()]);
    setSelectedBranchId("all");
    setSelectedCustomerId("all");
  };

  return (
    <>
      <WrapperContent<Order>
        title="Quản lý đơn hàng"
        isNotAccessible={!can("sales.orders", "view")}
        isLoading={permLoading || isLoading}
        header={{
          searchInput: {
            placeholder: "Tìm theo mã đơn, khách hàng...",
            filterKeys: ["orderCode", "customerName"],
            suggestions: {
              apiEndpoint: "/api/sales/orders",
              labelKey: "orderCode",
              descriptionKey: "customerName",
            },
          },
          customToolbar: (
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
          ),
          customToolbarSecondRow: (
            <>
              {isAdmin && (
                <Select
                  style={{ width: 180 }}
                  placeholder="Chi nhánh"
                  allowClear
                  value={selectedBranchId === "all" ? undefined : selectedBranchId}
                  onChange={(value: number | undefined) => setSelectedBranchId(value || "all")}
                  options={Array.isArray(branchesData) ? branchesData.map((b: { id: number; branchName: string }) => ({
                    label: b.branchName,
                    value: b.id,
                  })) : []}
                />
              )}
              <Select
                style={{ width: 160 }}
                placeholder="Trạng thái"
                allowClear
                value={query.status || undefined}
                onChange={(value) => updateQueries([{ key: "status", value: value || "" }])}
                options={[
                  { label: "Chờ xác nhận", value: "PENDING" },
                  { label: "Đã xác nhận", value: "CONFIRMED" },
                  { label: "Đang sản xuất", value: "IN_PRODUCTION" },
                  { label: "Sẵn sàng xuất kho", value: "READY_TO_EXPORT" },
                  { label: "Đã xuất kho", value: "EXPORTED" },
                  { label: "Hoàn thành", value: "COMPLETED" },
                  { label: "Đã hủy", value: "CANCELLED" },
                ]}
              />
              <Select
                style={{ width: 200 }}
                placeholder="Khách hàng"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={selectedCustomerId === "all" ? undefined : selectedCustomerId}
                onChange={(value: number | undefined) => setSelectedCustomerId(value || "all")}
                options={Array.isArray(customers) ? customers.map((c) => ({
                  label: `${c.customerName} (${c.customerCode})`,
                  value: c.id,
                })) : []}
              />
            </>
          ),
          buttonEnds: can("sales.orders", "create")
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
                onClick: handleCreateOrder,
                icon: <PlusOutlined />,
              },
              {
                type: "default",
                name: "Xuất Excel",
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
              {
                type: "default",
                name: "Nhập Excel",
                onClick: handleImportExcel,
                icon: <UploadOutlined />,
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
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
          filters: {
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
        }}
      >
        <div className="flex gap-4">
          <div className={`space-y-4 transition-all duration-300`}>
            <CommonTable
              DrawerDetails={({ data }: PropRowDetails<Order>) => (
                <OrderDetailDrawer
                  orderId={data?.id || null}
                  canEdit={can("sales.orders", "edit")}
                  onUpdateStatus={updateStatus}
                  onExportOrder={handleExportOrder}
                />
              )}
              columns={getVisibleColumns()}
              dataSource={filteredOrders}
              loading={permLoading || isLoading || isFetching}
              pagination={{ ...pagination, onChange: handlePageChange }}
            />
          </div>

          {/* Create Order Modal */}
          <Modal
            title={<div className="text-lg font-semibold">Tạo đơn hàng mới</div>}
            open={showCreateModal}
            onCancel={() => setShowCreateModal(false)}
            footer={null}
            width={1200}
            destroyOnHidden
          >
            <Form form={form} layout="vertical" onFinish={handleSubmitOrder}>
              <div className="flex gap-6">
                {/* Cột trái: Thông tin khách hàng + Danh sách hàng hóa */}
                <div className="flex-1 min-w-0">
                  {/* Thông tin khách hàng */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="text-sm font-semibold mb-3 text-blue-900">Thông tin khách hàng</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Form.Item
                        name="customerId"
                        label="Khách hàng"
                        rules={[
                          { required: true, message: "Vui lòng chọn khách hàng" },
                        ]}
                      >
                        <Select
                          placeholder="-- Chọn khách hàng --"
                          onChange={handleCustomerChange}
                          size="large"
                          showSearch
                          optionFilterProp="children"
                          popupRender={(menu) => (
                            <>
                              {menu}
                              <div className="border-t p-2">
                                <Button
                                  type="text"
                                  icon={<UserAddOutlined />}
                                  onClick={() => setShowNewCustomer(true)}
                                  className="w-full text-left text-blue-600"
                                >
                                  + Thêm khách hàng mới
                                </Button>
                              </div>
                            </>
                          )}
                        >
                          {Array.isArray(customers) &&
                            customers.map((c) => (
                              <Select.Option key={c.id} value={c.id}>
                                {c.customerName}{" "}
                                {c.groupName ? `(${c.groupName})` : ""}
                              </Select.Option>
                            ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="orderDate"
                        label="Ngày đặt"
                        rules={[
                          { required: true, message: "Vui lòng chọn ngày đặt" },
                        ]}
                      >
                        <Input type="date" size="large" />
                      </Form.Item>

                      <div>
                        <label className="text-sm text-gray-600 block mb-2">Chiết khấu KH</label>
                        <div className="h-10 flex items-center justify-center font-semibold text-green-600 bg-white rounded border border-blue-200">
                          {selectedCustomer ? `${selectedCustomer.priceMultiplier || 0}%` : '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form thêm khách hàng mới */}
                  {showNewCustomer && (
                    <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <UserAddOutlined className="text-blue-600" />
                          <span className="font-medium text-blue-800">
                            Thêm khách hàng mới
                          </span>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => {
                            setShowNewCustomer(false);
                            setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
                          }}
                        >
                          Hủy
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Tên khách hàng *</label>
                          <Input
                            placeholder="Nhập tên khách hàng"
                            value={newCustomer.customerName}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, customerName: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Số điện thoại</label>
                          <Input
                            placeholder="Nhập số điện thoại"
                            value={newCustomer.phone}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, phone: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Email</label>
                          <Input
                            placeholder="Nhập email"
                            value={newCustomer.email}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, email: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Địa chỉ</label>
                          <Input
                            placeholder="Nhập địa chỉ"
                            value={newCustomer.address}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, address: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="primary"
                          size="small"
                          loading={savingCustomer}
                          disabled={!newCustomer.customerName.trim()}
                          onClick={async () => {
                            if (!newCustomer.customerName.trim()) {
                              message.warning("Vui lòng nhập tên khách hàng");
                              return;
                            }
                            setSavingCustomer(true);
                            try {
                              const res = await fetch("/api/sales/customers", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  customerName: newCustomer.customerName,
                                  phone: newCustomer.phone || null,
                                  email: newCustomer.email || null,
                                  address: newCustomer.address || null,
                                }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                message.success(`Đã tạo khách hàng: ${data.data.customerName}`);
                                // Cập nhật danh sách khách hàng
                                queryClient.invalidateQueries({ queryKey: ["customers"] });
                                // Chọn khách hàng vừa tạo
                                setSelectedCustomer(data.data);
                                setOrderForm({ ...orderForm, customerId: data.data.id.toString() });
                                setShowNewCustomer(false);
                                setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
                              } else {
                                message.error(data.error || "Có lỗi xảy ra");
                              }
                            } catch {
                              message.error("Có lỗi xảy ra khi tạo khách hàng");
                            } finally {
                              setSavingCustomer(false);
                            }
                          }}
                        >
                          Lưu khách hàng
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Danh sách hàng hóa */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Danh sách hàng hoá <span className="text-red-500">*</span>
                      </h3>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={addOrderItem}
                        disabled={!selectedCustomer}
                      >
                        Thêm hàng hoá
                      </Button>
                    </div>

                    {orderItems.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                        <div className="text-gray-400 mb-2">
                          <ShoppingCartOutlined style={{ fontSize: 48 }} />
                        </div>
                        <p className="text-gray-500">Chưa có hàng hoá trong đơn</p>
                        {items.length === 0 && (
                          <p className="text-orange-600 text-sm mt-2">
                            Vui lòng tạo hàng hoá trong mục &quot;Sản phẩm → Hàng hoá&quot; trước
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderItems.map((item, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                            {/* Hàng 1: Hàng hóa + Số lượng + Đơn giá + Thành tiền + Nút xóa */}
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600 block mb-1">
                                  Hàng hoá <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  showSearch
                                  placeholder="Chọn hàng hoá"
                                  optionFilterProp="children"
                                  className="w-full"
                                  value={item.itemId}
                                  onChange={(val) => updateOrderItem(index, "itemId", val)}
                                  open={itemDropdownOpen === index}
                                  onDropdownVisibleChange={(open) => setItemDropdownOpen(open ? index : null)}
                                  popupRender={(menu) => (
                                    <>
                                      {menu}
                                      <div className="border-t p-2">
                                        <Button
                                          type="text"
                                          icon={<PlusOutlined />}
                                          onClick={() => {
                                            setItemDropdownOpen(null);
                                            setShowNewItemModal(true);
                                          }}
                                          className="w-full text-left text-blue-600"
                                        >
                                          + Thêm hàng hoá mới
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                >
                                  {items.map((i: any) => (
                                    <Select.Option key={i.id} value={i.id}>
                                      <div className="flex justify-between">
                                        <span>{i.itemName}</span>
                                        <span className="text-gray-400 text-xs">({i.itemCode})</span>
                                      </div>
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>
                              <div className="w-24">
                                <label className="text-xs font-medium text-gray-600 block mb-1">Số lượng</label>
                                <InputNumber
                                  min={1}
                                  className="w-full"
                                  value={item.quantity}
                                  onChange={(val) => updateOrderItem(index, "quantity", val)}
                                />
                              </div>
                              <div className="w-28">
                                <label className="text-xs font-medium text-gray-600 block mb-1">Đơn giá</label>
                                <InputNumber
                                  min={0}
                                  className="w-full"
                                  value={item.unitPrice}
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                                  disabled
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-xs font-medium text-gray-600 block mb-1">Thành tiền</label>
                                <div className="h-8 px-2 flex items-center justify-end font-semibold text-blue-600 bg-blue-50 rounded border border-blue-200">
                                  {formatCurrency(item.totalAmount)}
                                </div>
                              </div>
                              <Button
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => removeOrderItem(index)}
                                className="hover:bg-red-50"
                              />
                            </div>
                            {/* Hàng 2: Ghi chú */}
                            <div className="mt-2">
                              <Input
                                placeholder="Ghi chú cho sản phẩm này..."
                                size="small"
                                value={item.notes}
                                onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Ghi chú đơn hàng */}
                  <div className="mb-4">
                    <Form.Item name="notes" label={<span className="font-medium">Ghi chú đơn hàng</span>}>
                      <Input.TextArea
                        rows={3}
                        placeholder="Nhập ghi chú cho đơn hàng (nếu có)..."
                        className="resize-none"
                      />
                    </Form.Item>
                  </div>
                </div>

                {/* Cột phải: Phần tính tiền */}
                <div className="w-[380px] flex-shrink-0">
                  <div className="sticky top-0 bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">💰 Thanh toán</h3>

                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-600">Tổng tiền hàng:</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-gray-600 text-sm">Chiết khấu đơn hàng:</span>
                      <div className="flex items-center gap-2">
                        <Form.Item name="discountPercent" noStyle initialValue={0}>
                          <InputNumber
                            min={0}
                            max={100}
                            precision={2}
                            style={{ width: 70 }}
                            placeholder="0"
                            value={discountPercent}
                            onChange={(value: number | null) => {
                              const percent = value || 0;
                              const total = calculateTotal();
                              const amount = Math.round(total * percent / 100);
                              setDiscountPercent(percent);
                              setDiscountAmount(amount);
                              form.setFieldsValue({ discountAmount: amount, discountPercent: percent });
                            }}
                          />
                        </Form.Item>
                        <span>%</span>
                        <span className="mx-1">=</span>
                        <Form.Item name="discountAmount" noStyle initialValue={0}>
                          <InputNumber
                            min={0}
                            style={{ width: 120 }}
                            placeholder="0"
                            value={discountAmount}
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value!.replace(/\$\s?|(,*)/g, '')}
                            onChange={(value: string | number | null) => {
                              const amount = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
                              const total = calculateTotal();
                              const percent = total > 0 ? (amount / total * 100) : 0;
                              setDiscountAmount(amount);
                              setDiscountPercent(Math.round(percent * 100) / 100);
                              form.setFieldsValue({ discountPercent: Math.round(percent * 100) / 100, discountAmount: amount });
                            }}
                          />
                        </Form.Item>
                        <span>đ</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-lg border-t border-gray-300 pt-3">
                      <span className="font-bold text-gray-900">Khách phải trả:</span>
                      <span className="font-bold text-blue-600 text-xl">
                        {formatCurrency(calculateTotal() - discountAmount)}
                      </span>
                    </div>

                    {/* Tiền đặt cọc */}
                    <div className="mt-4 space-y-3 border-t border-gray-300 pt-3">
                      <div className="space-y-2">
                        <span className="text-gray-600 text-sm">Tiền đặt cọc:</span>
                        <Form.Item name="depositAmount" noStyle initialValue={0}>
                          <InputNumber
                            min={0}
                            max={calculateTotal() - discountAmount}
                            style={{ width: '100%' }}
                            placeholder="Nhập tiền đặt cọc (nếu có)"
                            value={depositAmount}
                            formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value: string | undefined) => value!.replace(/\$\s?|(,*)/g, '')}
                            onChange={(value: string | number | null) => {
                              const amount = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
                              setDepositAmount(amount);
                              form.setFieldsValue({ depositAmount: amount });
                            }}
                          />
                        </Form.Item>
                      </div>
                      {depositAmount > 0 && (
                        <div className="space-y-2">
                          <span className="text-gray-600 text-sm">Nhận vào tài khoản:</span>
                          <Select
                            style={{ width: '100%' }}
                            placeholder="Chọn tài khoản"
                            value={depositAccountId}
                            onChange={(value) => {
                              setDepositAccountId(value);
                              const acc = bankAccounts.find((a: any) => a.id === value);
                              setDepositMethod(acc?.accountType === 'CASH' ? 'CASH' : 'BANK');
                            }}
                            allowClear
                            options={bankAccounts.map((acc: any) => ({
                              label: `${acc.accountType === 'CASH' ? '💵' : '🏦'} ${acc.accountNumber} - ${acc.bankName}`,
                              value: acc.id,
                            }))}
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-600">Còn lại phải trả:</span>
                        <span className={`font-bold text-lg ${(calculateTotal() - discountAmount - depositAmount) > 0
                          ? 'text-red-600'
                          : 'text-green-600'
                          }`}>
                          {formatCurrency(Math.max(0, calculateTotal() - discountAmount - depositAmount))}
                        </span>
                      </div>
                      {depositAmount > 0 && (calculateTotal() - discountAmount - depositAmount) > 0 && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Khách hàng sẽ còn phải trả: {formatCurrency(calculateTotal() - discountAmount - depositAmount)}
                        </div>
                      )}
                    </div>

                    {/* Footer buttons */}
                    <div className="flex flex-col gap-2 border-t border-gray-300 pt-4 mt-4">
                      <Button
                        type="primary"
                        size="large"
                        htmlType="submit"
                        disabled={orderItems.length === 0 || !selectedCustomer}
                        loading={saveMutation.isPending}
                        icon={<CheckCircleOutlined />}
                        block
                      >
                        Tạo đơn hàng
                      </Button>
                      <Button size="large" onClick={() => setShowCreateModal(false)} block>
                        Hủy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Form>
          </Modal>

          {/* Quick Item Creation Modal */}
          <Modal
            title="Thêm hàng hoá mới"
            open={showNewItemModal}
            onCancel={() => {
              setShowNewItemModal(false);
              newItemForm.resetFields();
            }}
            onOk={handleCreateQuickItem}
            okText="Lưu hàng hoá"
            cancelText="Hủy"
            confirmLoading={savingItem}
            width={600}
            zIndex={1100}
          >
            <Form form={newItemForm} layout="vertical" initialValues={{ itemType: 'PRODUCT' }}>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="itemType"
                  label="Loại hàng"
                  rules={[{ required: true, message: "Vui lòng chọn loại" }]}
                >
                  <Select
                    placeholder="Chọn loại"
                    onChange={(type) => {
                      newItemForm.setFieldsValue({
                        costPrice: 0,
                      });
                    }}
                  >
                    <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
                    <Select.Option value="MATERIAL">Nguyên vật liệu</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item name="categoryId" label="Danh mục">
                  <Select
                    placeholder="Chọn danh mục"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {itemCategories.map((c: { id: number; categoryName: string }) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.categoryName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="itemName"
                label="Tên hàng hoá"
                rules={[{ required: true, message: "Vui lòng nhập tên" }]}
              >
                <Input placeholder="VD: Áo thun nam, Vải cotton..." />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="unit"
                  label="Đơn vị tính"
                  rules={[{ required: true, message: "Vui lòng chọn ĐVT" }]}
                >
                  <Select
                    placeholder="Đơn vị"
                    showSearch
                    allowClear
                    options={[
                      { label: "Cái", value: "Cái" },
                      { label: "Chiếc", value: "Chiếc" },
                      { label: "Bộ", value: "Bộ" },
                      { label: "Đôi", value: "Đôi" },
                      { label: "Mét", value: "Mét" },
                      { label: "Kg", value: "Kg" },
                      { label: "Gram", value: "Gram" },
                      { label: "Cuộn", value: "Cuộn" },
                      { label: "Tấm", value: "Tấm" },
                      { label: "Hộp", value: "Hộp" },
                      { label: "Gói", value: "Gói" },
                      { label: "Thùng", value: "Thùng" },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="costPrice" label="Giá bán">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    placeholder="0"
                  />
                </Form.Item>
              </div>

              <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
                💡 Hàng hoá được tạo từ đây sẽ tự động đánh dấu "Có thể bán" và hiển thị trong dropdown chọn hàng hoá.
              </div>
            </Form>
          </Modal>

          {/* Export Modal */}
          <ExportModal
            order={exportOrder}
            onClose={() => setExportOrder(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["orders"] });
              queryClient.invalidateQueries({ queryKey: ["items"] });
            }}
          />
        </div>
      </WrapperContent>
    </>
  );
}
