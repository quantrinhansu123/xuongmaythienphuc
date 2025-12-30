"use client";

import { formatCurrency, formatDate, formatQuantity } from "@/utils/format";
import {
    ArrowLeftOutlined,
    EditOutlined,
    EnvironmentOutlined,
    MailOutlined,
    PhoneOutlined,
    ShoppingCartOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Row, Spin, Table, Tag, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = params.id as string;

    // Fetch customer detail
    const { data: customer, isLoading: customerLoading } = useQuery({
        queryKey: ["customer-detail", customerId],
        queryFn: async () => {
            const res = await fetch(`/api/sales/customers/${customerId}`);
            const result = await res.json();
            return result.success ? result.data : null;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!customerId,
    });

    // Fetch customer orders
    const { data: orders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ["customer-orders", customerId],
        queryFn: async () => {
            const res = await fetch(`/api/sales/orders?customerId=${customerId}`);
            const result = await res.json();
            return result.success ? result.data || [] : [];
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!customerId,
    });

    const getStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            PENDING: "Chờ xác nhận",
            CONFIRMED: "Đã xác nhận",
            PAID: "Đã thanh toán",
            IN_PRODUCTION: "Đang sản xuất",
            READY_TO_EXPORT: "Chờ xuất kho",
            EXPORTED: "Đã xuất kho",
            COMPLETED: "Hoàn thành",
            CANCELLED: "Đã hủy",
        };
        return statusMap[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            PENDING: "orange",
            CONFIRMED: "blue",
            PAID: "purple",
            IN_PRODUCTION: "cyan",
            READY_TO_EXPORT: "geekblue",
            EXPORTED: "lime",
            COMPLETED: "green",
            CANCELLED: "red",
        };
        return colorMap[status] || "default";
    };

    // Calculate stats
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum: number, o: any) => sum + Number(o.finalAmount || 0), 0);
    const totalPaid = orders.reduce((sum: number, o: any) => sum + Number(o.depositAmount || 0) + Number(o.paidAmount || 0), 0);
    const totalDebt = customer?.debtAmount || 0;

    if (customerLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-96">
                <Spin size="large" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="p-6 text-center">
                <Text type="secondary">Không tìm thấy khách hàng</Text>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        Quay lại
                    </Button>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            <UserOutlined className="mr-2" />
                            {customer.customerName}
                        </Title>
                        <Text type="secondary" className="text-sm">
                            Mã KH: {customer.customerCode}
                        </Text>
                    </div>
                </div>
                <Button type="primary" icon={<EditOutlined />} onClick={() => router.push(`/sales/customers?edit=${customer.id}`)}>
                    Chỉnh sửa
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {/* Thông tin khách hàng - ưu tiên trước */}
                <Col span={24}>
                    <Card title={<span className="text-lg">Thông tin khách hàng</span>}>
                        <div className="flex flex-wrap gap-x-10 gap-y-4 text-base">
                            <div>
                                <span className="text-gray-400">Mã KH:</span>
                                <span className="ml-2 font-mono font-bold text-lg">{customer.customerCode}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Tên:</span>
                                <span className="ml-2 font-bold text-lg">{customer.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <PhoneOutlined className="text-gray-400" />
                                <span className="font-semibold text-lg">{customer.phone || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MailOutlined className="text-gray-400" />
                                <span>{customer.email || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <EnvironmentOutlined className="text-gray-400" />
                                <span>{customer.address || "-"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Nhóm:</span>
                                <span className="ml-2">{customer.groupName || "-"}</span>
                            </div>
                            <Tag color={customer.isActive ? "green" : "red"} className="text-base px-3 py-1">
                                {customer.isActive ? "Hoạt động" : "Ngừng"}
                            </Tag>
                        </div>
                    </Card>
                </Col>

                {/* Thống kê */}
                <Col span={24}>
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center bg-blue-50 border-blue-200">
                                <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                                <div className="text-xs text-gray-600">Tổng đơn</div>
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center bg-green-50 border-green-200">
                                <div className="text-base font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                                <div className="text-xs text-gray-600">Tổng tiền</div>
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center bg-purple-50 border-purple-200">
                                <div className="text-base font-bold text-purple-600">{formatCurrency(totalPaid)}</div>
                                <div className="text-xs text-gray-600">Đã thanh toán</div>
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center bg-red-50 border-red-200">
                                <div className="text-base font-bold text-red-600">{formatCurrency(totalDebt)}</div>
                                <div className="text-xs text-gray-600">Công nợ</div>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                {/* Lịch sử đơn hàng */}
                <Col span={24}>
                    <Card
                        title={
                            <div className="flex items-center gap-2">
                                <ShoppingCartOutlined />
                                <span>Lịch sử đơn hàng ({totalOrders})</span>
                            </div>
                        }
                        loading={ordersLoading}
                    >
                        <Table
                            dataSource={orders}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            expandable={{
                                expandedRowRender: (record: any) => (
                                    <OrderDetailExpand orderId={record.id} />
                                ),
                            }}
                            columns={[
                                {
                                    title: "Mã đơn",
                                    dataIndex: "orderCode",
                                    key: "orderCode",
                                    width: 130,
                                    render: (val: string) => <span className="font-mono font-medium text-blue-600">{val}</span>,
                                },
                                {
                                    title: "Ngày đặt",
                                    dataIndex: "orderDate",
                                    key: "orderDate",
                                    width: 110,
                                    render: (val: string) => formatDate(val),
                                },
                                {
                                    title: "Tổng tiền",
                                    dataIndex: "finalAmount",
                                    key: "finalAmount",
                                    width: 130,
                                    align: "right" as const,
                                    render: (val: number) => <span className="font-semibold">{formatCurrency(val)}</span>,
                                },
                                {
                                    title: "Đã trả",
                                    key: "paid",
                                    width: 120,
                                    align: "right" as const,
                                    render: (_: any, record: any) => (
                                        <span className="text-green-600 font-medium">
                                            {formatCurrency((Number(record.depositAmount) || 0) + (Number(record.paidAmount) || 0))}
                                        </span>
                                    ),
                                },
                                {
                                    title: "Còn nợ",
                                    dataIndex: "remainingAmount",
                                    key: "remainingAmount",
                                    width: 120,
                                    align: "right" as const,
                                    render: (val: number) => (
                                        <span className={val > 0 ? "text-red-600 font-medium" : "text-gray-400"}>
                                            {formatCurrency(val || 0)}
                                        </span>
                                    ),
                                },
                                {
                                    title: "Trạng thái",
                                    dataIndex: "status",
                                    key: "status",
                                    width: 130,
                                    render: (val: string) => (
                                        <Tag color={getStatusColor(val)}>{getStatusText(val)}</Tag>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

// Component để fetch và hiển thị chi tiết đơn hàng khi expand
function OrderDetailExpand({ orderId }: { orderId: number }) {
    const { data: orderDetail, isLoading } = useQuery({
        queryKey: ["order-detail", orderId],
        queryFn: async () => {
            const res = await fetch(`/api/sales/orders/${orderId}`);
            const result = await res.json();
            return result.success ? result.data : null;
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <div className="py-4 text-center"><Spin /></div>;
    }

    if (!orderDetail || !orderDetail.details?.length) {
        return <div className="py-4 text-center text-gray-400">Không có chi tiết sản phẩm</div>;
    }

    return (
        <div className="bg-gray-50 p-4 rounded">
            <div className="font-medium mb-2">Chi tiết sản phẩm:</div>
            <Table
                dataSource={orderDetail.details}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                    {
                        title: "Mã SP",
                        dataIndex: "itemCode",
                        key: "itemCode",
                        width: 120,
                        render: (val: string) => <span className="font-mono text-xs">{val || "-"}</span>,
                    },
                    {
                        title: "Tên sản phẩm",
                        dataIndex: "itemName",
                        key: "itemName",
                        render: (val: string) => <span className="font-medium">{val || "-"}</span>,
                    },
                    {
                        title: "SL",
                        dataIndex: "quantity",
                        key: "quantity",
                        width: 80,
                        align: "center" as const,
                        render: (val: number) => formatQuantity(val),
                    },
                    {
                        title: "Đơn giá",
                        dataIndex: "unitPrice",
                        key: "unitPrice",
                        width: 120,
                        align: "right" as const,
                        render: (val: number) => formatCurrency(val),
                    },
                    {
                        title: "Thành tiền",
                        dataIndex: "totalAmount",
                        key: "totalAmount",
                        width: 130,
                        align: "right" as const,
                        render: (val: number) => <span className="font-medium">{formatCurrency(val)}</span>,
                    },
                    {
                        title: "Thông số",
                        key: "measurements",
                        width: 200,
                        render: (_: any, record: any) => (
                            <div className="text-xs">
                                {record.measurements?.length > 0 ? (
                                    record.measurements.slice(0, 3).map((m: any, idx: number) => (
                                        <span key={idx} className="mr-2">
                                            <span className="text-gray-500">{m.attributeName}:</span> {m.value}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
            {orderDetail.notes && (
                <div className="mt-3 text-sm">
                    <span className="text-gray-500">Ghi chú: </span>
                    <span>{orderDetail.notes}</span>
                </div>
            )}
        </div>
    );
}
