"use client";

import type { OrderDetail } from "@/services/orderService";
import { formatCurrency } from "@/utils/format";
import {
  PrinterOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Space,
  Steps
} from "antd";

interface OrderDetailDrawerProps {
  open: boolean;
  order: OrderDetail | null;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  onUpdateProductionStep: (id: number, step: string) => void;
  onLoadMaterialSuggestion: (id: number) => void;
  canEdit: boolean;
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    WAITING_MATERIAL: "Chờ nguyên liệu",
    IN_PRODUCTION: "Đang sản xuất",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return statusMap[status] || status;
};

export default function OrderDetailDrawer({
  open,
  order,
  onClose,
  onUpdateStatus,
  onUpdateProductionStep,
  onLoadMaterialSuggestion,
  canEdit,
}: OrderDetailDrawerProps) {
  const { modal } = App.useApp();
  if (!order) return null;

  const handlePrint = () => {
    window.open(`/api/sales/orders/${order.id}/pdf`, "_blank");
  };

  const handleConfirmStatus = (
    status: string,
    title: string,
    content: string
  ) => {
    modal.confirm({
      title,
      content,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: () => onUpdateStatus(order.id, status),
    });
  };

  const allProductionStepsCompleted =
    order.production?.cutting &&
    order.production?.sewing &&
    order.production?.finishing &&
    order.production?.quality_check;

  return (
    <Drawer
      title="Chi tiết đơn hàng"
      placement="right"
      onClose={onClose}
      open={open}
      size={720}
      extra={
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            In PDF
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        {/* Thông tin đơn hàng */}
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Mã đơn" span={2}>
            <span className="font-mono font-semibold">{order.orderCode}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng" span={2}>
            {order.customerName}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày đặt">
            {new Date(order.orderDate).toLocaleDateString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Người tạo">
            {order.createdBy}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái" span={2}>
            <span
              className={`px-2 py-1 rounded text-xs ${
                order.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : order.status === "CONFIRMED"
                  ? "bg-blue-100 text-blue-800"
                  : order.status === "WAITING_MATERIAL"
                  ? "bg-orange-100 text-orange-800"
                  : order.status === "IN_PRODUCTION"
                  ? "bg-purple-100 text-purple-800"
                  : order.status === "COMPLETED"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {getStatusText(order.status)}
            </span>
          </Descriptions.Item>
          {order.notes && (
            <Descriptions.Item label="Ghi chú" span={2}>
              {order.notes}
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Tiến trình */}
        {order.status !== "CANCELLED" && (
          <div>
            <h4 className="font-semibold mb-3">Tiến trình đơn hàng</h4>
            <Steps
              direction="vertical"
              size="small"
              current={
                order.status === "PENDING"
                  ? 0
                  : order.status === "CONFIRMED"
                  ? 1
                  : order.status === "WAITING_MATERIAL"
                  ? 2
                  : order.status === "IN_PRODUCTION"
                  ? 3
                  : 4
              }
              items={[
                {
                  title: "Chờ xác nhận",
                  description: "Đơn hàng đang chờ xác nhận",
                },
                {
                  title: "Đã xác nhận",
                  description: "Đơn hàng đã được xác nhận",
                },
                {
                  title: "Chờ nguyên liệu",
                  description:
                    order.status === "WAITING_MATERIAL" && canEdit ? (
                      <Space orientation="vertical" size="small">
                        <span>Kiểm tra và chuẩn bị nguyên liệu</span>
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => onLoadMaterialSuggestion(order.id)}
                          >
                            Gợi ý nhập hàng
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              onUpdateStatus(order.id, "IN_PRODUCTION")
                            }
                          >
                            Bỏ qua - Bắt đầu SX
                          </Button>
                        </Space>
                      </Space>
                    ) : (
                      "Kiểm tra và chuẩn bị nguyên liệu"
                    ),
                },
                {
                  title: "Sản xuất",
                  description:
                    order.status === "IN_PRODUCTION" &&
                    order.production &&
                    canEdit ? (
                      <Space orientation="vertical" size="small" className="mt-2">
                        <Checkbox
                          checked={order.production.cutting}
                          onChange={() =>
                            onUpdateProductionStep(order.id, "cutting")
                          }
                        >
                          Cắt
                        </Checkbox>
                        <Checkbox
                          checked={order.production.sewing}
                          onChange={() =>
                            onUpdateProductionStep(order.id, "sewing")
                          }
                        >
                          May
                        </Checkbox>
                        <Checkbox
                          checked={order.production.finishing}
                          onChange={() =>
                            onUpdateProductionStep(order.id, "finishing")
                          }
                        >
                          Hoàn thiện
                        </Checkbox>
                        <Checkbox
                          checked={order.production.quality_check}
                          onChange={() =>
                            onUpdateProductionStep(order.id, "quality_check")
                          }
                        >
                          Kiểm định
                        </Checkbox>
                        {allProductionStepsCompleted && (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() =>
                              onUpdateStatus(order.id, "COMPLETED")
                            }
                          >
                            Hoàn thành đơn hàng
                          </Button>
                        )}
                      </Space>
                    ) : (
                      "Quy trình: Cắt → May → Hoàn thiện → Kiểm định"
                    ),
                },
                { title: "Hoàn thành", description: "Đơn hàng đã hoàn thành" },
              ]}
            />
          </div>
        )}

        {/* Danh sách sản phẩm */}
        <div>
          <h4 className="font-semibold mb-3">Danh sách sản phẩm</h4>
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left border">STT</th>
                <th className="px-3 py-2 text-left border">Sản phẩm</th>
                <th className="px-3 py-2 text-right border">SL</th>
                <th className="px-3 py-2 text-right border">Đơn giá</th>
                <th className="px-3 py-2 text-right border">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.details?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{item.productName}</td>
                  <td className="px-3 py-2 text-right border">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right border">
                    {formatCurrency(item.unitPrice, "")}
                  </td>
                  <td className="px-3 py-2 text-right border font-semibold">
                    {formatCurrency(item.totalAmount, "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-2 text-right">
            <div>
              Tổng tiền:{" "}
              <span className="font-semibold">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            {order.discountAmount > 0 && (
              <div className="text-red-600">
                Giảm giá: -{formatCurrency(order.discountAmount)}
              </div>
            )}
            <div className="text-lg font-bold text-blue-600">
              Thành tiền: {formatCurrency(order.finalAmount)}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canEdit && (
          <Space className="w-full justify-end">
            {order.status === "PENDING" && (
              <>
                <Button
                  danger
                  onClick={() =>
                    handleConfirmStatus(
                      "CANCELLED",
                      "Hủy đơn hàng",
                      "Bạn có chắc muốn hủy đơn hàng này?"
                    )
                  }
                >
                  Hủy đơn
                </Button>
                <Button
                  type="primary"
                  onClick={() =>
                    handleConfirmStatus(
                      "CONFIRMED",
                      "Xác nhận đơn hàng",
                      "Xác nhận đơn hàng này?"
                    )
                  }
                >
                  Xác nhận đơn
                </Button>
              </>
            )}
            {order.status === "CONFIRMED" && (
              <>
                <Button
                  onClick={() => onUpdateStatus(order.id, "WAITING_MATERIAL")}
                >
                  → Chờ nguyên liệu
                </Button>
                <Button
                  type="primary"
                  onClick={() => onUpdateStatus(order.id, "IN_PRODUCTION")}
                >
                  → Bắt đầu SX
                </Button>
              </>
            )}
          </Space>
        )}
      </Space>
    </Drawer>
  );
}
