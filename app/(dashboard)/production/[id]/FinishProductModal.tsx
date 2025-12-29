"use client";

import { formatQuantity } from "@/utils/format";
import { SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, InputNumber, Modal, Select, Table, message } from "antd";
import { useEffect, useState } from "react";

interface FinishProductModalProps {
    open: boolean;
    onCancel: () => void;
    productionOrderId: string;
    orderItems: any[];
    targetWarehouseId?: number;
    targetWarehouseName?: string;
}

export default function FinishProductModal({
    open,
    onCancel,
    productionOrderId,
    orderItems,
    targetWarehouseId,
}: FinishProductModalProps) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // Fetch Warehouses (Thành phẩm và Hỗn hợp)
    const { data: warehousesTP } = useQuery({
        queryKey: ["warehouses", "THANH_PHAM"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=THANH_PHAM");
            const data = await res.json();
            return data.data || [];
        },
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    const { data: warehousesHH } = useQuery({
        queryKey: ["warehouses", "HON_HOP"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=HON_HOP");
            const data = await res.json();
            return data.data || [];
        },
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    // Lấy lịch sử nhập để biết đã nhập bao nhiêu
    const { data: importHistory } = useQuery({
        queryKey: ["production-finished-imports", productionOrderId],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${productionOrderId}/finished-imports`);
            const data = await res.json();
            return data.data || { imports: [], totalImported: 0 };
        },
        staleTime: 30 * 1000,
        enabled: open && !!productionOrderId,
    });

    const warehouses = [...(warehousesTP || []), ...(warehousesHH || [])];
    const loadingWarehouses = !warehousesTP && !warehousesHH;

    const totalImported = importHistory?.totalImported || 0;
    const orderedQty = orderItems?.[0]?.quantity || 0;
    const remainingQty = Math.max(0, orderedQty - totalImported);

    // Initialize form values
    useEffect(() => {
        if (open) {
            const initialValues: any = {};
            if (targetWarehouseId) {
                initialValues.warehouseId = targetWarehouseId;
            }
            // Set remaining quantity as default
            if (orderItems) {
                orderItems.forEach((item: any) => {
                    const itemImported = totalImported; // Simplified for single item
                    const remaining = Math.max(0, item.quantity - itemImported);
                    initialValues[`qty_${item.itemId}`] = remaining;
                });
            }
            form.setFieldsValue(initialValues);
        }
    }, [orderItems, form, open, targetWarehouseId, totalImported]);

    const handleFinish = async (values: any) => {
        if (!values.warehouseId) {
            message.error("Vui lòng chọn kho nhập");
            return;
        }

        setSubmitting(true);
        try {
            const items = orderItems.map((item: any) => ({
                itemId: item.itemId,
                quantity: values[`qty_${item.itemId}`] || 0,
            }));

            // Kiểm tra có số lượng > 0
            const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            if (totalQty <= 0) {
                message.error("Vui lòng nhập số lượng thành phẩm (phải > 0)");
                setSubmitting(false);
                return;
            }

            const res = await fetch(
                `/api/production/orders/${productionOrderId}/finish-product`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        warehouseId: values.warehouseId,
                        items,
                    }),
                }
            );

            const data = await res.json();
            if (data.success) {
                message.success(data.message || "Đã nhập kho thành phẩm");
                queryClient.invalidateQueries({
                    queryKey: ["production-order", productionOrderId],
                });
                queryClient.invalidateQueries({
                    queryKey: ["production-finished-imports", productionOrderId],
                });
                onCancel();
            } else {
                message.error(data.error || "Lỗi khi nhập kho");
            }
        } catch (error) {
            console.error("Error finishing product:", error);
            message.error("Lỗi khi nhập kho");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title="Nhập kho thành phẩm"
            open={open}
            onCancel={onCancel}
            width={800}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={() => form.submit()}
                >
                    Nhập kho
                </Button>,
            ]}
        >
            {/* Progress Alert */}
            <Alert
                type={totalImported >= orderedQty ? "success" : "info"}
                showIcon
                className="mb-4"
                message={
                    <span>
                        Tiến độ nhập kho: <strong>{formatQuantity(totalImported)}</strong> / <strong>{formatQuantity(orderedQty)}</strong> sản phẩm
                        {remainingQty > 0 && <span className="text-orange-600 ml-2">(Còn lại: {formatQuantity(remainingQty)})</span>}
                        {totalImported >= orderedQty && <span className="text-green-600 ml-2">✓ Đủ số lượng!</span>}
                    </span>
                }
            />

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    name="warehouseId"
                    label="Kho nhập thành phẩm"
                    rules={[{ required: true, message: "Vui lòng chọn kho" }]}
                >
                    <Select
                        placeholder="Chọn kho thành phẩm hoặc hỗn hợp"
                        loading={loadingWarehouses}
                    >
                        {warehouses?.map((w: any) => (
                            <Select.Option key={w.id} value={w.id}>
                                {w.warehouseName} - {w.warehouseType === 'THANH_PHAM' ? 'Thành phẩm' : 'Hỗn hợp'} ({w.address})
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Table
                    dataSource={orderItems}
                    rowKey="itemId"
                    pagination={false}
                    columns={[
                        {
                            title: "Mã SP",
                            dataIndex: "itemCode",
                            key: "itemCode",
                        },
                        {
                            title: "Tên sản phẩm",
                            dataIndex: "itemName",
                            key: "itemName",
                        },
                        {
                            title: "SL đặt hàng",
                            dataIndex: "quantity",
                            key: "quantity",
                            render: (val) => formatQuantity(val),
                        },
                        {
                            title: "Đã nhập",
                            key: "imported",
                            render: () => <span className="font-semibold text-blue-600">{formatQuantity(totalImported)}</span>,
                        },
                        {
                            title: "SL nhập lần này",
                            key: "quantityImport",
                            render: (_, record: any) => (
                                <Form.Item
                                    name={`qty_${record.itemId}`}
                                    style={{ marginBottom: 0 }}
                                    rules={[{ required: true, message: "Nhập số lượng" }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0}
                                        max={remainingQty}
                                        formatter={(value) =>
                                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        }
                                        parser={(value) =>
                                            (value?.replace(/\$\s?|(,*)/g, "") || 0) as any
                                        }
                                    />
                                </Form.Item>
                            ),
                        },
                    ]}
                />
            </Form>
        </Modal>
    );
}
