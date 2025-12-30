"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatQuantity } from "@/utils/format";
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    EditOutlined,
    PrinterOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    App,
    Button,
    Card,
    Collapse,
    Descriptions,
    Form,
    InputNumber,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id ? Number(params.id) : null;
    const { can } = usePermissions();
    const { message, modal } = App.useApp();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    const [paymentForm] = Form.useForm();
    const [stockByWarehouse, setStockByWarehouse] = useState<any[]>([]);
    const [needsProduction, setNeedsProduction] = useState<boolean | null>(null);

    // Fetch order detail
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
        staleTime: 2 * 60 * 1000,
        enabled: !!orderId,
    });

    // Fetch bank accounts for payment
    const { data: paymentAccounts = [] } = useQuery({
        queryKey: ["bank-accounts-active", orderData?.branchId],
        queryFn: async () => {
            const branchParam = orderData?.branchId ? `&branchId=${orderData.branchId}` : '';
            const res = await fetch(`/api/finance/bank-accounts?isActive=true${branchParam}`);
            const data = await res.json();
            return data.success ? data.data || [] : [];
        },
        staleTime: 10 * 60 * 1000,
        enabled: !!orderData?.branchId,
    });

    // Check stock availability
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

    // Check if order needs production
    useEffect(() => {
        if (orderData && stockByWarehouse.length > 0) {
            const hasMeasurements = orderData.details?.some((d: any) =>
                d.measurements && Array.isArray(d.measurements) && d.measurements.length > 0
            );
            if (hasMeasurements) {
                setNeedsProduction(true);
                return;
            }
            const storeWarehouses = stockByWarehouse.filter((w: any) =>
                w.warehouseType === 'THANH_PHAM' || w.warehouseType === 'HON_HOP'
            );
            if (storeWarehouses.length > 0) {
                const allItemsAvailable = storeWarehouses.some((w: any) => w.canFulfill);
                setNeedsProduction(!allItemsAvailable);
            } else {
                setNeedsProduction(true);
            }
        }
    }, [orderData, stockByWarehouse]);

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ status, paymentData }: { status: string; paymentData?: any }) => {
            if (paymentData) {
                await fetch(`/api/sales/orders/${orderId}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentData),
                });
            }
            const res = await fetch(`/api/sales/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            return res.json();
        },
        onSuccess: () => {
            message.success('Cập nhật trạng thái thành công');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: () => {
            message.error('Có lỗi xảy ra');
        },
    });

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

    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            PENDING: "orange",
            CONFIRMED: "blue",
            PAID: "purple",
            IN_PRODUCTION: "purple",
            READY_TO_EXPORT: "cyan",
            EXPORTED: "blue",
            COMPLETED: "green",
            CANCELLED: "red",
        };
        return colorMap[status] || "default";
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !orderData) {
        return (
            <div className="p-4">
                <Alert message="Không tìm thấy đơn hàng" type="error" showIcon />
                <Button onClick={() => router.back()} className="mt-4">
                    Quay lại
                </Button>
            </div>
        );
    }

    const data = orderData;
    const totalOriginal = (data.details || []).reduce(
        (sum: number, item: any) => sum + (parseFloat(String(item.costPrice || item.unitPrice)) * parseFloat(String(item.quantity))),
        0
    );
    const totalReduction = totalOriginal - (parseFloat(String(data.finalAmount)) - (data.otherCosts || 0));
    const remaining = data.finalAmount - (data.depositAmount || 0) - (data.paidAmount || 0);
    const canEdit = can("sales.orders", "edit");

    return (
        <div className={`${isMobile ? 'p-3' : 'p-6'} space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => router.push('/sales/orders')}
                        size={isMobile ? "small" : "middle"}
                    >
                        {!isMobile && "Quay lại"}
                    </Button>
                    <div>
                        <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                            {data.orderCode}
                        </Typography.Title>
                        <Tag color={getStatusColor(data.status)}>{getStatusText(data.status)}</Tag>
                    </div>
                </div>
                <Space wrap size="small">
                    <Button
                        icon={<PrinterOutlined />}
                        size={isMobile ? "small" : "middle"}
                        onClick={() => window.open(`/api/sales/orders/${data.id}/pdf`, "_blank", "noopener,noreferrer")}
                    >
                        In
                    </Button>
                    {data.status === "PENDING" && canEdit && (
                        <Button
                            icon={<EditOutlined />}
                            size={isMobile ? "small" : "middle"}
                            onClick={() => router.push(`/sales/orders?edit=${data.id}`)}
                        >
                            Sửa
                        </Button>
                    )}
                </Space>
            </div>

            {/* Main Content - Responsive Grid */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                {/* Thông tin khách hàng */}
                <Card title="Thông tin đơn hàng" size="small">
                    <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
                        <Descriptions.Item label="Khách hàng">
                            <Typography.Text strong>{data.customerName}</Typography.Text>
                        </Descriptions.Item>
                        {data.customerPhone && (
                            <Descriptions.Item label="Điện thoại">{data.customerPhone}</Descriptions.Item>
                        )}
                        {data.customerEmail && (
                            <Descriptions.Item label="Email">{data.customerEmail}</Descriptions.Item>
                        )}
                        {data.customerAddress && (
                            <Descriptions.Item label="Địa chỉ">{data.customerAddress}</Descriptions.Item>
                        )}
                        <Descriptions.Item label="Chi nhánh">{data.branchName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Ngày đặt">
                            {new Date(data.orderDate).toLocaleDateString("vi-VN")}
                        </Descriptions.Item>
                        <Descriptions.Item label="Người tạo">{data.createdBy}</Descriptions.Item>
                        {data.notes && (
                            <Descriptions.Item label="Ghi chú">{data.notes}</Descriptions.Item>
                        )}
                    </Descriptions>
                </Card>

                {/* Tổng quan chi phí */}
                <Card title="Tổng quan chi phí" size="small" className="bg-blue-50/30">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Typography.Text type="secondary">Tổng tiền hàng (gốc):</Typography.Text>
                            <Typography.Text>{formatCurrency(totalOriginal)}</Typography.Text>
                        </div>
                        {totalReduction > 0 && (
                            <div className="flex justify-between text-red-500">
                                <Typography.Text type="danger">Giảm giá:</Typography.Text>
                                <Typography.Text type="danger">-{formatCurrency(totalReduction)}</Typography.Text>
                            </div>
                        )}
                        <div className="flex justify-between text-orange-500">
                            <Typography.Text style={{ color: '#fa8c16' }}>Chi phí phát sinh:</Typography.Text>
                            <Typography.Text style={{ color: '#fa8c16' }}>+{formatCurrency(data.otherCosts || 0)}</Typography.Text>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                            <Typography.Text strong>Thành tiền:</Typography.Text>
                            <Typography.Text strong className="text-xl text-blue-600">{formatCurrency(data.finalAmount)}</Typography.Text>
                        </div>
                        <div className="bg-white p-3 rounded border mt-3 space-y-1">
                            <div className="flex justify-between">
                                <Typography.Text type="secondary">Tiền cọc:</Typography.Text>
                                <Typography.Text style={{ color: '#52c41a' }}>{formatCurrency(data.depositAmount || 0)}</Typography.Text>
                            </div>
                            <div className="flex justify-between">
                                <Typography.Text type="secondary">Đã thanh toán:</Typography.Text>
                                <Typography.Text style={{ color: '#52c41a' }}>{formatCurrency(data.paidAmount || 0)}</Typography.Text>
                            </div>
                            <div className="border-t pt-1 flex justify-between">
                                <Typography.Text strong>Còn lại:</Typography.Text>
                                <Typography.Text strong style={{ color: remaining > 0 ? '#ff4d4f' : '#52c41a' }}>
                                    {formatCurrency(remaining)}
                                </Typography.Text>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tiến trình đơn hàng */}
            {data.status !== "CANCELLED" && (
                <Card title="Tiến trình đơn hàng" size="small">
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-5'} gap-3`}>
                        {[
                            { step: 1, status: "PENDING", label: "Chờ xác nhận" },
                            { step: 2, status: "CONFIRMED", label: "Đặt cọc" },
                            { step: 3, status: "PAID", label: "Sản xuất" },
                            { step: 4, status: "READY_TO_EXPORT", label: "Xuất kho" },
                            { step: 5, status: "COMPLETED", label: "Hoàn thành" },
                        ].map(({ step, status, label }) => {
                            const statusOrder = ["PENDING", "CONFIRMED", "PAID", "IN_PRODUCTION", "READY_TO_EXPORT", "EXPORTED", "COMPLETED"];
                            const currentIdx = statusOrder.indexOf(data.status);
                            const stepIdx = statusOrder.indexOf(status);
                            const isActive = stepIdx <= currentIdx;
                            const isCurrent = data.status === status ||
                                (status === "PAID" && ["PAID", "IN_PRODUCTION"].includes(data.status)) ||
                                (status === "READY_TO_EXPORT" && ["READY_TO_EXPORT", "EXPORTED"].includes(data.status));

                            return (
                                <div
                                    key={step}
                                    className={`p-3 rounded-lg border-2 ${isActive ? 'border-green-500 bg-green-50' :
                                            isCurrent ? 'border-blue-500 bg-blue-50' :
                                                'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                                            }`}>
                                            {step}
                                        </div>
                                        <Typography.Text strong className="text-sm">{label}</Typography.Text>
                                    </div>

                                    {/* Action buttons for current step */}
                                    {data.status === "PENDING" && step === 1 && canEdit && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className="mt-2 w-full"
                                            icon={<CheckCircleOutlined />}
                                            onClick={() => updateStatusMutation.mutate({ status: "CONFIRMED" })}
                                            loading={updateStatusMutation.isPending}
                                        >
                                            Xác nhận
                                        </Button>
                                    )}

                                    {data.status === "CONFIRMED" && step === 2 && canEdit && remaining > 0 && (
                                        <div className="mt-2 p-2 bg-white rounded border">
                                            <Form
                                                form={paymentForm}
                                                size="small"
                                                onFinish={(values) => {
                                                    const acc = paymentAccounts.find((a: any) => a.id === values.bankAccountId);
                                                    updateStatusMutation.mutate({
                                                        status: 'PAID',
                                                        paymentData: {
                                                            paymentAmount: values.paymentAmount,
                                                            paymentMethod: acc?.accountType === 'CASH' ? 'CASH' : 'BANK',
                                                            bankAccountId: values.bankAccountId,
                                                            isDeposit: true
                                                        }
                                                    });
                                                    paymentForm.resetFields();
                                                }}
                                            >
                                                <Form.Item name="paymentAmount" rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                                                    <InputNumber
                                                        placeholder="Số tiền cọc"
                                                        min={0}
                                                        max={remaining}
                                                        style={{ width: '100%' }}
                                                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                        parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                                                    />
                                                </Form.Item>
                                                <Form.Item name="bankAccountId" rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                                                    <Select placeholder="Tài khoản" size="small">
                                                        {paymentAccounts.map((acc: any) => (
                                                            <Select.Option key={acc.id} value={acc.id}>
                                                                {acc.accountType === 'CASH' ? '💵' : '🏦'} {acc.accountNumber}
                                                            </Select.Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                                <Button type="primary" htmlType="submit" size="small" block loading={updateStatusMutation.isPending}>
                                                    Xác nhận cọc
                                                </Button>
                                            </Form>
                                        </div>
                                    )}

                                    {data.status === "PAID" && step === 3 && canEdit && (
                                        <Space direction="vertical" size="small" className="mt-2 w-full">
                                            {needsProduction !== false && (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    block
                                                    onClick={async () => {
                                                        const res = await fetch('/api/production/orders', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ orderId: data.id })
                                                        });
                                                        const result = await res.json();
                                                        if (result.success) {
                                                            message.success(result.message);
                                                            updateStatusMutation.mutate({ status: "IN_PRODUCTION" });
                                                        } else {
                                                            message.error(result.error);
                                                        }
                                                    }}
                                                >
                                                    Tạo lệnh SX
                                                </Button>
                                            )}
                                            <Button
                                                size="small"
                                                block
                                                onClick={() => updateStatusMutation.mutate({ status: "READY_TO_EXPORT" })}
                                            >
                                                {needsProduction === false ? "Chuyển xuất kho" : "Bỏ qua SX"}
                                            </Button>
                                        </Space>
                                    )}

                                    {data.status === "READY_TO_EXPORT" && step === 4 && canEdit && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className="mt-2 w-full"
                                            onClick={() => router.push(`/sales/orders?export=${data.id}`)}
                                        >
                                            Xuất kho
                                        </Button>
                                    )}

                                    {data.status === "EXPORTED" && step === 5 && canEdit && (
                                        <Button
                                            type="primary"
                                            size="small"
                                            className="mt-2 w-full"
                                            onClick={() => updateStatusMutation.mutate({ status: "COMPLETED" })}
                                            loading={updateStatusMutation.isPending}
                                        >
                                            Hoàn thành
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Chi tiết sản phẩm */}
            <Card title={`Chi tiết sản phẩm (${data.details?.length || 0})`} size="small">
                <div className="overflow-x-auto">
                    <Table
                        columns={[
                            { title: "Sản phẩm", dataIndex: "itemName", key: "itemName", width: 200 },
                            {
                                title: "SL",
                                dataIndex: "quantity",
                                key: "quantity",
                                width: 80,
                                align: "right",
                                render: (v: number) => formatQuantity(v)
                            },
                            {
                                title: "Đơn giá",
                                dataIndex: "unitPrice",
                                key: "unitPrice",
                                width: 120,
                                align: "right",
                                render: (v: number) => formatCurrency(v, "")
                            },
                            {
                                title: "Thành tiền",
                                dataIndex: "totalAmount",
                                key: "totalAmount",
                                width: 120,
                                align: "right",
                                render: (v: number) => <strong>{formatCurrency(v, "")}</strong>
                            },
                        ]}
                        dataSource={data.details || []}
                        rowKey={(record, index) => `item-${index}`}
                        pagination={false}
                        size="small"
                        scroll={{ x: isMobile ? 500 : undefined }}
                        expandable={{
                            expandedRowRender: (record: any) => (
                                record.measurements && record.measurements.length > 0 ? (
                                    <div className="p-2 bg-gray-50 rounded">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {record.measurements.map((m: any, idx: number) => (
                                                <div key={idx}>
                                                    <span className="text-gray-500">{m.attributeName}:</span>{" "}
                                                    <span className="font-medium">{m.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            ),
                            rowExpandable: (record: any) => !!(record.measurements && record.measurements.length > 0),
                        }}
                    />
                </div>
            </Card>

            {/* Kiểm tra tồn kho */}
            {stockByWarehouse.length > 0 && (
                <Collapse
                    size="small"
                    items={[{
                        key: 'stock',
                        label: 'Kiểm tra tồn kho',
                        children: (
                            <div className="overflow-x-auto">
                                <Table
                                    dataSource={stockByWarehouse}
                                    rowKey="warehouseId"
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouse' },
                                        {
                                            title: 'Trạng thái',
                                            key: 'status',
                                            render: (_: any, r: any) => r.canFulfill ? <Tag color="green">Đủ hàng</Tag> : <Tag color="red">Thiếu</Tag>
                                        },
                                    ]}
                                />
                            </div>
                        )
                    }]}
                />
            )}

            {/* Cancel button for PENDING */}
            {data.status === "PENDING" && canEdit && (
                <div className="text-center pt-4 border-t">
                    <Button
                        danger
                        onClick={() => {
                            modal.confirm({
                                title: 'Xác nhận hủy đơn',
                                content: 'Bạn có chắc muốn hủy đơn hàng này?',
                                okText: 'Hủy đơn',
                                okType: 'danger',
                                cancelText: 'Không',
                                onOk: () => updateStatusMutation.mutate({ status: "CANCELLED" }),
                            });
                        }}
                    >
                        Hủy đơn hàng
                    </Button>
                </div>
            )}
        </div>
    );
}
