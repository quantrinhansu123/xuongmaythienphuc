import { Button, Form, Input, Modal, Table, message } from "antd";
import { useEffect, useState } from "react";

interface OrderMeasurementsModalProps {
    orderId: number;
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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

export default function OrderMeasurementsModal({
    orderId,
    visible,
    onClose,
    onSuccess,
}: OrderMeasurementsModalProps) {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible && orderId) {
            fetchOrderDetails();
        }
    }, [visible, orderId]);

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
                onSuccess();
                onClose();
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

    const columns = [
        {
            title: "Sản phẩm",
            dataIndex: "itemName",
            key: "itemName",
            width: "30%",
        },
        {
            title: "Thông số",
            key: "measurements",
            render: (_: any, record: OrderItem) => (
                <div className="space-y-2">
                    {record.measurements.map((m) => (
                        <div key={m.attributeId} className="flex items-center gap-2">
                            <span className="w-24 text-sm text-gray-600">{m.attributeName}:</span>
                            <Form.Item
                                name={`${record.id}_${m.attributeId}`}
                                noStyle
                                initialValue={m.value}
                            >
                                <Input size="small" style={{ width: 150 }} placeholder="Nhập giá trị" />
                            </Form.Item>
                        </div>
                    ))}
                </div>
            ),
        },
    ];

    return (
        <Modal
            title="Nhập thông số sản phẩm"
            open={visible}
            onCancel={onClose}
            width={700}
            footer={[
                <Button key="cancel" onClick={onClose}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={submitting}
                    onClick={() => form.submit()}
                >
                    Lưu thông số
                </Button>,
            ]}
        >
            <Form form={form} onFinish={handleFinish}>
                <Table
                    dataSource={items}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    size="small"
                    locale={{ emptyText: "Không có sản phẩm nào cần nhập thông số" }}
                />
            </Form>
        </Modal>
    );
}
