"use client";

import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, InputNumber, Select, Space, Spin, Table, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

const { Title } = Typography;

export default function MaterialImportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // 1. Fetch Warehouses (NVL)
    const { data: warehouses, isLoading: loadingWarehouses } = useQuery({
        queryKey: ["warehouses", "NVL"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=NVL");
            const data = await res.json();
            return data.data;
        },
        staleTime: 10 * 60 * 1000, // Cache
    });

    // 2. Fetch Material Requirements
    const { data: requirements, isLoading: loadingRequirements } = useQuery({
        queryKey: ["material-requirements", id],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${id}/material-requirements`);
            const data = await res.json();
            return data.data;
        },
        staleTime: 30 * 60 * 1000, // Cache
    });

    // Initialize form values
    useEffect(() => {
        if (requirements) {
            const initialValues: any = {};
            requirements.forEach((item: any) => {
                initialValues[`qty_${item.materialId}`] = item.quantityPlanned;
            });
            form.setFieldsValue(initialValues);
        }
    }, [requirements, form]);

    const handleFinish = async (values: any) => {
        if (!values.warehouseId) {
            message.error("Vui lòng chọn kho xuất");
            return;
        }

        setSubmitting(true);
        try {
            const items = requirements.map((req: any) => ({
                materialId: req.materialId,
                quantityPlanned: req.quantityPlanned,
                quantityActual: values[`qty_${req.materialId}`] || 0,
            }));

            const res = await fetch(`/api/production/orders/${id}/material-import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    warehouseId: values.warehouseId,
                    items,
                }),
            });

            const data = await res.json();
            if (data.success) {
                message.success("Đã tạo phiếu xuất kho thành công");
                router.push(`/production/${id}`);
            } else {
                message.error(data.error || "Lỗi khi tạo phiếu xuất kho");
            }
        } catch (error) {
            console.error("Error creating material import:", error);
            message.error("Lỗi khi tạo phiếu xuất kho");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingWarehouses || loadingRequirements) {
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
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        Quay lại
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        Nhập nguyên vật liệu (Xuất kho sản xuất)
                    </Title>
                </Space>
            </div>

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Card className="mb-6">
                    <Form.Item
                        name="warehouseId"
                        label="Chọn kho xuất (Kho NVL)"
                        rules={[{ required: true, message: "Vui lòng chọn kho" }]}
                    >
                        <Select placeholder="Chọn kho nguyên vật liệu">
                            {warehouses?.map((w: any) => (
                                <Select.Option key={w.id} value={w.id}>
                                    {w.warehouseName} ({w.address})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Card>

                <Card title="Danh sách nguyên vật liệu cần xuất">
                    <Table
                        dataSource={requirements}
                        rowKey="materialId"
                        pagination={false}
                        columns={[
                            {
                                title: "Mã NVL",
                                dataIndex: "materialCode",
                                key: "materialCode",
                            },
                            {
                                title: "Tên NVL",
                                dataIndex: "materialName",
                                key: "materialName",
                            },
                            {
                                title: "Đơn vị",
                                dataIndex: "unit",
                                key: "unit",
                            },
                            {
                                title: "Định mức (Dự kiến)",
                                dataIndex: "quantityPlanned",
                                key: "quantityPlanned",
                                render: (val) => Number(val).toLocaleString("vi-VN"),
                            },
                            {
                                title: "Thực xuất",
                                key: "quantityActual",
                                render: (_, record: any) => (
                                    <Form.Item
                                        name={`qty_${record.materialId}`}
                                        style={{ marginBottom: 0 }}
                                        rules={[{ required: true, message: "Nhập số lượng" }]}
                                    >
                                        <InputNumber
                                            style={{ width: "100%" }}
                                            min={0}
                                            step={0.01}
                                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                            parser={(value) => (value?.replace(/\$\s?|(,*)/g, "") || 0) as any}
                                        />
                                    </Form.Item>
                                ),
                            },
                        ]}
                    />
                </Card>

                <div className="mt-6 flex justify-end">
                    <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={submitting}
                        onClick={() => form.submit()}
                    >
                        Tạo phiếu xuất kho
                    </Button>
                </div>
            </Form>
        </div>
    );
}
