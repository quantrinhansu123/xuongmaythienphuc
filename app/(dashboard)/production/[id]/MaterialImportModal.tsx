"use client";

import { SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Form, InputNumber, Modal, Select, Table, message } from "antd";
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

    // 2. Fetch Material Requirements (Detailed per item now)
    const { data: requirements, isLoading: loadingRequirements } = useQuery({
        queryKey: ["material-requirements", productionOrderId],
        queryFn: async () => {
            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-requirements`
            );
            const data = await res.json();
            return data.data || [];
        },
        staleTime: 5 * 60 * 1000,
        enabled: open && !!productionOrderId,
    });

    // 3. Fetch Material Exports History to calculate already exported amount
    const { data: materialExports } = useQuery({
        queryKey: ["production-order-exports", productionOrderId],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${productionOrderId}/material-exports`);
            const data = await res.json();
            return data.data || [];
        },
        enabled: open && !!productionOrderId,
    });

    // Get already exported quantity for a specific material and product
    // Note: The API for export history returns list of export records.
    // It maps by materialCode/Name.
    // requirements have: materialId, productId, materialCode, ...
    // export history has: materialCode, etc. (It might not have productId if exports are just by material)
    // However, in production, we tracked exports by material.
    // Let's assume exports are tracked by material globally for the order or try to match exactly.
    // Based on `material-exports` API, it joins production_material_request_details -> items (material).
    // It doesn't seem to track which 'product' the material was for, just THAT it was exported for the order.
    // But requirements are split by product.
    // If we have multiple products using same material, `materialExports` will just show total exported of that material.
    // So we should probably sum up requirements by material to compare, or just show total exported per material.
    // But the table is by Product -> Material.
    // If we show "Already Exported" per row (Product-Material), but we only know Total Exported per Material, 
    // it's hard to split. 
    // However, the user request "mỗi chi tiết đơn là một sp" implies we are now strictly 1 product per production order.
    // So distinct (Material) is enough because there is only 1 Product!

    // Check if there is only 1 product in requirements?
    // The requirements API now filters by `order_item_id`. YES. 
    // So `requirements` should list materials for that SINGLE product.
    // So `materialExports` for this production order are definitely for this product.

    const getExportedQuantity = (materialCode: string) => {
        if (!materialExports) return 0;
        return materialExports
            .filter((exp: any) => exp.materialCode === materialCode)
            .reduce((sum: number, exp: any) => sum + Number(exp.quantityActual || 0), 0);
    };

    // Initialize form values
    useEffect(() => {
        if (open) {
            // Set warehouse nếu đã có
            if (sourceWarehouseId) {
                form.setFieldsValue({ warehouseId: sourceWarehouseId });
            }
            // 不需要 set quantityPlanned, user enters quantityActual manually.
            // Maybe pre-fill remaining quantity? (Planned - Exported)
            // But strict requirement was just to show "Already Exported".

            // Optionally, we could pre-fill with 0 or remaining. 
            // Let's leave it empty or 0 to force user check.
        }
    }, [open, sourceWarehouseId, form]);

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

            // Filter out items with 0 quantity if desired? No, maybe they want to record 0.
            // But usually we only export what we have. 
            // API expects items.

            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-import`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        warehouseId: values.warehouseId,
                        items,
                        isFinished: values.isFinished,
                    }),
                }
            );

            const data = await res.json();
            if (data.success) {
                message.success("Đã tạo phiếu xuất kho thành công");
                form.resetFields();
                onCancel();
                // Refetch production order and exports
                await queryClient.invalidateQueries({
                    queryKey: ["production-order", productionOrderId],
                });
                await queryClient.invalidateQueries({
                    queryKey: ["production-order-exports", productionOrderId],
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

                <Form.Item
                    name="isFinished"
                    valuePropName="checked"
                    className="mb-4"
                >
                    <Checkbox className="text-base font-medium text-blue-700">
                        Hoàn thành khâu Xuất kho (Chuyển sang bước Cắt)
                    </Checkbox>
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
                            title: "Đã xuất kho",
                            key: "exported",
                            render: (_, record: any) => {
                                const qty = getExportedQuantity(record.materialCode);
                                return <span className="font-semibold text-blue-600">{Number(qty).toLocaleString("vi-VN")}</span>;
                            }
                        },
                        {
                            title: "Thực xuất lần này",
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
