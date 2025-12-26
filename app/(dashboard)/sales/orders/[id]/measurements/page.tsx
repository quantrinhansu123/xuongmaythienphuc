"use client";

import { LeftOutlined, SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input, Space, Spin, Table, Typography } from "antd";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface Measurement {
    orderDetailId: number;
    attributeId: number;
    attributeName: string;
    value: string;
}

interface OrderItem {
    id: number; // order_detail_id
    itemName: string;
    measurements: Measurement[];
}

export default function OrderMeasurementsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { message } = App.useApp();
    const resolvedParams = use(params);
    const orderId = parseInt(resolvedParams.id);

    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sales/orders/${orderId}`);
            const data = await res.json();
            if (data.success) {
                // Filter items that have measurements (attributes)
                const itemsWithAttributes = data.data.details.filter(
                    (item: any) => item.measurements && item.measurements.length > 0
                );
                setItems(itemsWithAttributes);

                // Initialize form values
                const initialValues: any = {};
                itemsWithAttributes.forEach((item: any) => {
                    item.measurements.forEach((m: any) => {
                        initialValues[`${item.id}_${m.attributeId}`] = m.value;
                    });
                });
                form.setFieldsValue(initialValues);
            }
        } catch (error) {
            console.error("Error fetching order details:", error);
            message.error("Lỗi khi tải thông tin đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = async (values: any) => {
        setSubmitting(true);
        try {
            const measurementsToUpdate = [];

            for (const [key, value] of Object.entries(values)) {
                const [orderDetailId, attributeId] = key.split('_');
                measurementsToUpdate.push({
                    orderDetailId: parseInt(orderDetailId),
                    attributeId: parseInt(attributeId),
                    value: value,
                });
            }

            const res = await fetch(`/api/sales/orders/${orderId}/measurements`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ measurements: measurementsToUpdate }),
            });

            const data = await res.json();
            if (data.success) {
                message.success("Cập nhật thông số thành công");

                // Tạo đơn sản xuất tự động (không chờ kết quả)
                fetch('/api/production/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: orderId })
                }).then(prodRes => prodRes.json())
                  .then(prodData => {
                      if (prodData.success) {
                          console.log("Đã tạo đơn sản xuất:", prodData.data.id);
                      }
                  })
                  .catch(e => console.error("Error creating production order:", e));

                // Quay lại trang đơn hàng ngay (không đợi tạo đơn sản xuất)
                router.push(`/sales/orders`);
            } else {
                message.error(data.error || "Lỗi khi cập nhật thông số");
            }
        } catch (error) {
            console.error("Error updating measurements:", error);
            message.error("Lỗi khi cập nhật thông số");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <Space>
                    <Button icon={<LeftOutlined />} onClick={() => router.back()}>
                        Quay lại
                    </Button>
                    <div>
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            Nhập thông số đơn hàng #{orderId}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Nhập thông số cho {items.length} sản phẩm
                        </Typography.Text>
                    </div>
                </Space>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={() => form.submit()}
                    size="large"
                >
                    Lưu thông số
                </Button>
            </div>

            <Card>
                <Form form={form} onFinish={handleFinish}>
                    <Table
                        dataSource={items}
                        columns={[
                            {
                                title: "Sản phẩm",
                                dataIndex: "itemName",
                                key: "itemName",
                                width: "30%",
                                render: (text) => <span className="font-medium">{text}</span>
                            },
                            {
                                title: "Thông số",
                                key: "measurements",
                                render: (_: any, record: OrderItem) => (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {record.measurements.map((m) => (
                                            <div key={m.attributeId} className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-500">{m.attributeName}</span>
                                                <Form.Item
                                                    name={`${record.id}_${m.attributeId}`}
                                                    noStyle
                                                    initialValue={m.value}
                                                >
                                                    <Input size="small" placeholder={`Nhập ${m.attributeName.toLowerCase()}`} />
                                                </Form.Item>
                                            </div>
                                        ))}
                                    </div>
                                ),
                            },
                        ]}
                        rowKey="id"
                        pagination={false}
                        loading={loading}
                        size="small"
                        locale={{ emptyText: "Không có sản phẩm nào cần nhập thông số" }}
                    />
                </Form>
            </Card>
        </div>
    );
}
