"use client";

import { SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, InputNumber, Modal, Select, Table, message } from "antd";
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
    targetWarehouseName,
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
        staleTime: 10 * 60 * 1000, // Cache
        enabled: open,
    });

    const { data: warehousesHH } = useQuery({
        queryKey: ["warehouses", "HON_HOP"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=HON_HOP");
            const data = await res.json();
            return data.data || [];
        },
        staleTime: 10 * 60 * 1000, // Cache
        enabled: open,
    });

    const warehouses = [...(warehousesTP || []), ...(warehousesHH || [])];
    const loadingWarehouses = !warehousesTP && !warehousesHH;

    // Initialize form values
    useEffect(() => {
        if (open) {
            const initialValues: any = {};
            // Set warehouse nếu đã có
            if (targetWarehouseId) {
                initialValues.warehouseId = targetWarehouseId;
            }
            // Set quantities
            if (orderItems) {
                orderItems.forEach((item: any) => {
                    initialValues[`qty_${item.itemId}`] = item.quantity;
                });
            }
            form.setFieldsValue(initialValues);
        }
    }, [orderItems, form, open, targetWarehouseId]);

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
                message.success("Đã nhập kho thành phẩm thành công");
                queryClient.invalidateQueries({
                    queryKey: ["production-order", productionOrderId],
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
                    Nhập kho & Hoàn thành
                </Button>,
            ]}
        >
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
                            render: (val) => Number(val).toLocaleString("vi-VN"),
                        },
                        {
                            title: "SL nhập kho",
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
