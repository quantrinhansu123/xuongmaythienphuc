"use client";

import { SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, InputNumber, Modal, Select, Table, message } from "antd";
import { useEffect, useState } from "react";

interface MaterialImportModalProps {
    open: boolean;
    onCancel: () => void;
    productionOrderId: string;
    sourceWarehouseId?: number;
    sourceWarehouseName?: string;
}

export default function MaterialImportModal({
    open,
    onCancel,
    productionOrderId,
    sourceWarehouseId,
    sourceWarehouseName,
}: MaterialImportModalProps) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // 1. Fetch Warehouses (NVL)
    const { data: warehouses, isLoading: loadingWarehouses } = useQuery({
        queryKey: ["warehouses", "NVL"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=NVL");
            const data = await res.json();
            return data.data;
        },
        staleTime: 10 * 60 * 1000, // Cache
        enabled: open,
    });

    // 2. Fetch Material Requirements
    const { data: requirements, isLoading: loadingRequirements } = useQuery({
        queryKey: ["material-requirements", productionOrderId],
        queryFn: async () => {
            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-requirements`
            );
            const data = await res.json();
            return data.data;
        },
        staleTime: 30 * 60 * 1000, // Cache
        enabled: open && !!productionOrderId,
    });

    // Initialize form values
    useEffect(() => {
        if (open) {
            // Set warehouse nếu đã có
            if (sourceWarehouseId) {
                form.setFieldsValue({ warehouseId: sourceWarehouseId });
            }
            // Set quantities
            if (requirements) {
                const initialValues: any = { warehouseId: sourceWarehouseId };
                requirements.forEach((item: any) => {
                    initialValues[`qty_${item.materialId}_${item.productId}`] = item.quantityPlanned;
                });
                form.setFieldsValue(initialValues);
            }
        }
    }, [requirements, form, open, sourceWarehouseId]);

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
                quantityActual: values[`qty_${req.materialId}_${req.productId}`] || 0,
            }));

            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-import`,
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
                message.success("Đã tạo phiếu xuất kho thành công");
                form.resetFields();
                onCancel();
                // Refetch sau khi đóng modal để UI cập nhật
                await queryClient.invalidateQueries({
                    queryKey: ["production-order", productionOrderId],
                });
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

    return (
        <Modal
            title="Nhập nguyên vật liệu (Xuất kho sản xuất)"
            open={open}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    disabled={!requirements || requirements.length === 0}
                    onClick={() => form.submit()}
                >
                    Tạo phiếu xuất kho
                </Button>,
            ]}
        >
            {/* Warning when no BOM / no materials */}
            {!loadingRequirements && (!requirements || requirements.length === 0) && (
                <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-semibold text-orange-800">Không có NVL để nhập!</h3>
                            <p className="text-sm text-orange-700 mt-1">
                                Sản phẩm trong đơn sản xuất này chưa có định mức nguyên vật liệu (BOM).
                            </p>
                            <p className="text-sm text-orange-700">
                                Vui lòng vào <strong>Quản lý Hàng hoá → Định mức</strong> để thiết lập danh sách NVL cho sản phẩm.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Section */}
            {requirements && requirements.length > 0 && (
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 font-semibold text-gray-700">Tổng hợp nhu cầu vật tư:</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {Object.values(
                            requirements.reduce((acc: any, item: any) => {
                                if (!acc[item.materialId]) {
                                    acc[item.materialId] = {
                                        materialName: item.materialName,
                                        materialCode: item.materialCode,
                                        unit: item.unit,
                                        totalQuantity: 0,
                                    };
                                }
                                acc[item.materialId].totalQuantity += Number(item.quantityPlanned);
                                return acc;
                            }, {})
                        ).map((item: any) => (
                            <div key={item.materialCode} className="flex flex-col rounded bg-white p-2 shadow-sm">
                                <span className="text-xs text-gray-500">{item.materialName} ({item.unit})</span>
                                <span className="text-lg font-bold text-blue-600">
                                    {Number(item.totalQuantity).toLocaleString("vi-VN")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )
            }

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    name="warehouseId"
                    label="Kho xuất (Kho NVL)"
                    rules={[{ required: true, message: "Vui lòng chọn kho" }]}
                >
                    <Select placeholder="Chọn kho nguyên vật liệu" loading={loadingWarehouses}>
                        {warehouses?.map((w: any) => (
                            <Select.Option key={w.id} value={w.id}>
                                {w.warehouseName} ({w.address})
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Table
                    dataSource={requirements}
                    rowKey={(record: any) => `${record.materialId}_${record.productId}`}
                    pagination={false}
                    loading={loadingRequirements}
                    columns={[
                        {
                            title: "Sản phẩm",
                            dataIndex: "productName",
                            key: "productName",
                            render: (text, record: any, index) => {
                                const obj = {
                                    children: <span className="font-medium">{text}</span>,
                                    props: { rowSpan: 1 },
                                };
                                // Simple rowSpan logic: check previous item
                                if (index > 0 && requirements[index - 1].productId === record.productId) {
                                    obj.props.rowSpan = 0;
                                } else {
                                    let count = 0;
                                    for (let i = index; i < requirements.length; i++) {
                                        if (requirements[i].productId === record.productId) {
                                            count++;
                                        } else {
                                            break;
                                        }
                                    }
                                    obj.props.rowSpan = count;
                                }
                                return obj;
                            },
                        },
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
                                    name={`qty_${record.materialId}_${record.productId}`}
                                    style={{ marginBottom: 0 }}
                                    rules={[{ required: true, message: "Nhập số lượng" }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0}
                                        step={0.01}
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
        </Modal >
    );
}
