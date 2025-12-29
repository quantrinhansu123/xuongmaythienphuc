"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import { usePermissions } from "@/hooks/usePermissions";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Checkbox,
    Descriptions,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Tabs,
    Tag
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const { TextArea } = Input;

interface CategoryAttribute {
    id: number;
    attributeName: string;
    attributeType: string;
    options: string[];
    isRequired: boolean;
}

interface CategoryMeasurement {
    id: number;
    measurementName: string;
    unit: string;
    options: string[];
    isRequired: boolean;
}

interface CategoryTemplate {
    id: number;
    templateCode: string;
    templateName: string;
    attributeValues: Record<string, string>;
    measurementValues: Record<string, number>;
    isActive: boolean;
}

interface Category {
    id: number;
    categoryCode: string;
    categoryName: string;
    type: string;
    description?: string;
}

export default function CategoryDetailPage() {
    const { can, loading: permLoading } = usePermissions();
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useParams();
    const categoryId = params.id as string;

    const [activeTab, setActiveTab] = useState("templates");

    // Modal states
    const [showAttributeModal, setShowAttributeModal] = useState(false);
    const [showMeasurementModal, setShowMeasurementModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<CategoryAttribute | null>(null);
    const [editingMeasurement, setEditingMeasurement] = useState<CategoryMeasurement | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<CategoryTemplate | null>(null);

    const [attributeForm] = Form.useForm();
    const [measurementForm] = Form.useForm();
    const [templateForm] = Form.useForm();

    // Fetch category info
    const { data: category } = useQuery<Category>({
        queryKey: ["category", categoryId],
        queryFn: async () => {
            const res = await fetch(`/api/products/item-categories`);
            const data = await res.json();
            if (data.success) {
                return data.data.find((c: Category) => c.id === parseInt(categoryId));
            }
            return null;
        },
        enabled: !!categoryId,
    });

    // Fetch attributes
    const { data: attributes = [], isLoading: attributesLoading } = useQuery<CategoryAttribute[]>({
        queryKey: ["category-attributes", categoryId],
        queryFn: async () => {
            const res = await fetch(`/api/categories/${categoryId}/attributes`);
            const data = await res.json();
            return data.success ? data.data || [] : [];
        },
        enabled: !!categoryId,
    });

    // Fetch measurements
    const { data: measurements = [], isLoading: measurementsLoading } = useQuery<CategoryMeasurement[]>({
        queryKey: ["category-measurements", categoryId],
        queryFn: async () => {
            const res = await fetch(`/api/products/categories/${categoryId}/measurements`);
            const data = await res.json();
            return data.success ? data.data || [] : [];
        },
        enabled: !!categoryId,
    });

    // Fetch templates
    const { data: templates = [], isLoading: templatesLoading } = useQuery<CategoryTemplate[]>({
        queryKey: ["category-templates", categoryId],
        queryFn: async () => {
            const res = await fetch(`/api/products/categories/${categoryId}/templates`);
            const data = await res.json();
            return data.success ? data.data || [] : [];
        },
        enabled: !!categoryId,
    });

    // Mutations for attributes
    const saveAttributeMutation = useMutation({
        mutationFn: async (values: Record<string, unknown>) => {
            const url = editingAttribute
                ? `/api/categories/${categoryId}/attributes/${editingAttribute.id}`
                : `/api/categories/${categoryId}/attributes`;
            const method = editingAttribute ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success(editingAttribute ? "Cập nhật thuộc tính thành công" : "Thêm thuộc tính thành công");
            setShowAttributeModal(false);
            queryClient.invalidateQueries({ queryKey: ["category-attributes", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    const deleteAttributeMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/categories/${categoryId}/attributes/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success("Xóa thuộc tính thành công");
            queryClient.invalidateQueries({ queryKey: ["category-attributes", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    // Mutations for measurements
    const saveMeasurementMutation = useMutation({
        mutationFn: async (values: Record<string, unknown>) => {
            const url = editingMeasurement
                ? `/api/products/categories/${categoryId}/measurements/${editingMeasurement.id}`
                : `/api/products/categories/${categoryId}/measurements`;
            const method = editingMeasurement ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success(editingMeasurement ? "Cập nhật thông số thành công" : "Thêm thông số thành công");
            setShowMeasurementModal(false);
            queryClient.invalidateQueries({ queryKey: ["category-measurements", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    const deleteMeasurementMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/products/categories/${categoryId}/measurements/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success("Xóa thông số thành công");
            queryClient.invalidateQueries({ queryKey: ["category-measurements", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    // Mutations for templates
    const saveTemplateMutation = useMutation({
        mutationFn: async (values: Record<string, unknown>) => {
            const url = editingTemplate
                ? `/api/products/categories/templates/${editingTemplate.id}`
                : `/api/products/categories/${categoryId}/templates`;
            const method = editingTemplate ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success(editingTemplate ? "Cập nhật mẫu thành công" : "Thêm mẫu thành công");
            setShowTemplateModal(false);
            queryClient.invalidateQueries({ queryKey: ["category-templates", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/products/categories/templates/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            message.success("Xóa mẫu thành công");
            queryClient.invalidateQueries({ queryKey: ["category-templates", categoryId] });
        },
        onError: (error: Error) => message.error(error.message),
    });

    // Handlers
    const handleAddAttribute = () => {
        setEditingAttribute(null);
        attributeForm.resetFields();
        setShowAttributeModal(true);
    };

    const handleEditAttribute = (attr: CategoryAttribute) => {
        setEditingAttribute(attr);
        attributeForm.setFieldsValue({
            attributeName: attr.attributeName,
            attributeType: attr.attributeType,
            options: attr.options?.join(", "),
            isRequired: attr.isRequired,
        });
        setShowAttributeModal(true);
    };

    const handleAddMeasurement = () => {
        setEditingMeasurement(null);
        measurementForm.resetFields();
        setShowMeasurementModal(true);
    };

    const handleEditMeasurement = (m: CategoryMeasurement) => {
        setEditingMeasurement(m);
        measurementForm.setFieldsValue({
            measurementName: m.measurementName,
            unit: m.unit,
            options: m.options?.join(", "),
            isRequired: m.isRequired,
        });
        setShowMeasurementModal(true);
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        templateForm.resetFields();
        setShowTemplateModal(true);
    };

    const handleEditTemplate = (t: CategoryTemplate) => {
        setEditingTemplate(t);

        // Extract selected attribute names from attributeValues
        const selectedAttributes = Object.keys(t.attributeValues || {});

        // Build measurement values with meas_ prefix
        const measValues: Record<string, unknown> = {};
        measurements.forEach(m => {
            const val = t.measurementValues?.[m.measurementName];
            if (val !== undefined) {
                // If measurement has options, wrap value in array for tags mode
                measValues[`meas_${m.id}`] = m.options && m.options.length > 0 ? [val] : val;
            }
        });

        templateForm.setFieldsValue({
            templateName: t.templateName,
            isActive: t.isActive,
            selectedAttributes,
            ...measValues,
        });
        setShowTemplateModal(true);
    };

    const handleSaveTemplate = async () => {
        try {
            const values = await templateForm.validateFields();

            // Extract selected attributes (from checkboxes)
            const selectedAttributes = values.selectedAttributes || [];
            const attributeValues: Record<string, string> = {};
            selectedAttributes.forEach((attrName: string) => {
                attributeValues[attrName] = 'true'; // Just mark as selected
            });

            // Extract measurement values
            const measurementValues: Record<string, string | number> = {};
            measurements.forEach(m => {
                const val = values[`meas_${m.id}`];
                if (val !== undefined && val !== null) {
                    // Handle array value from tags mode (take first value)
                    const finalVal = Array.isArray(val) ? val[0] : val;
                    if (finalVal !== undefined) {
                        measurementValues[m.measurementName] = finalVal;
                    }
                }
            });

            saveTemplateMutation.mutate({
                templateName: values.templateName,
                attributeValues,
                measurementValues,
                isActive: values.isActive ?? true,
            });
        } catch {
            // validation error
        }
    };

    // Columns
    const attributeColumns = [
        { title: "Tên thuộc tính", dataIndex: "attributeName", key: "attributeName" },
        {
            title: "",
            key: "actions",
            width: 80,
            render: (_: unknown, record: CategoryAttribute) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditAttribute(record)} />
                    <Popconfirm title="Xóa thuộc tính này?" onConfirm={() => deleteAttributeMutation.mutate(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const measurementColumns = [
        { title: "Tên thông số", dataIndex: "measurementName", key: "measurementName" },
        { title: "Đơn vị", dataIndex: "unit", key: "unit", width: 80 },
        {
            title: "Lựa chọn có sẵn",
            dataIndex: "options",
            key: "options",
            width: 200,
            render: (val: string[]) => val && val.length > 0 ? (
                <span>{val.join(", ")}</span>
            ) : <span style={{ color: '#999' }}>Nhập tự do</span>,
        },
        {
            title: "Bắt buộc",
            dataIndex: "isRequired",
            key: "isRequired",
            width: 80,
            render: (val: boolean) => <Tag color={val ? "red" : "default"}>{val ? "Có" : "Không"}</Tag>,
        },
        {
            title: "",
            key: "actions",
            width: 80,
            render: (_: unknown, record: CategoryMeasurement) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditMeasurement(record)} />
                    <Popconfirm title="Xóa thông số này?" onConfirm={() => deleteMeasurementMutation.mutate(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const templateColumns = [
        { title: "Mã", dataIndex: "templateCode", key: "templateCode", width: 90 },
        { title: "Tên mẫu", dataIndex: "templateName", key: "templateName" },
        {
            title: "Thuộc tính",
            dataIndex: "attributeValues",
            key: "attributeValues",
            ellipsis: true,
            render: (val: Record<string, string>) => (
                <span>{Object.entries(val || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "-"}</span>
            ),
        },
        {
            title: "Thông số",
            dataIndex: "measurementValues",
            key: "measurementValues",
            ellipsis: true,
            render: (val: Record<string, number>) => (
                <span>{Object.entries(val || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "-"}</span>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 90,
            render: (val: boolean) => <Tag color={val ? "success" : "default"}>{val ? "Hoạt động" : "Ngừng"}</Tag>,
        },
        {
            title: "",
            key: "actions",
            width: 80,
            render: (_: unknown, record: CategoryTemplate) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditTemplate(record)} />
                    <Popconfirm title="Xóa mẫu này?" onConfirm={() => deleteTemplateMutation.mutate(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <WrapperContent
                title={`Chi tiết: ${category?.categoryName || "Đang tải..."}`}
                isNotAccessible={!can("products.categories", "view")}
                isLoading={permLoading}
                header={{
                    buttonBackTo: "/products/item-categories",
                    refetchDataWithKeys: ["category-attributes", "category-measurements", "category-templates"],
                }}
            >
                <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Mã danh mục">{category?.categoryCode}</Descriptions.Item>
                    <Descriptions.Item label="Loại">
                        <Tag color={category?.type === "MATERIAL" ? "orange" : "green"}>
                            {category?.type === "MATERIAL" ? "Nguyên phụ liệu" : "Thành phẩm"}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mô tả" span={2}>{category?.description || "-"}</Descriptions.Item>
                </Descriptions>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: "templates",
                            label: `Mẫu sản phẩm (${templates.length})`,
                            children: (
                                <div>
                                    <div className="mb-4">
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTemplate}>
                                            Thêm mẫu
                                        </Button>
                                    </div>
                                    <CommonTable
                                        columns={templateColumns}
                                        dataSource={templates}
                                        loading={templatesLoading}
                                        pagination={{ current: 1, limit: 10, onChange: () => { } }}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: "attributes",
                            label: `Thuộc tính (${attributes.length})`,
                            children: (
                                <div>
                                    <div className="mb-4">
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAttribute}>
                                            Thêm thuộc tính
                                        </Button>
                                    </div>
                                    <CommonTable
                                        columns={attributeColumns}
                                        dataSource={attributes}
                                        loading={attributesLoading}
                                        pagination={{ current: 1, limit: 10, onChange: () => { } }}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: "measurements",
                            label: `Thông số đo (${measurements.length})`,
                            children: (
                                <div>
                                    <div className="mb-4">
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMeasurement}>
                                            Thêm thông số
                                        </Button>
                                    </div>
                                    <CommonTable
                                        columns={measurementColumns}
                                        dataSource={measurements}
                                        loading={measurementsLoading}
                                        pagination={{ current: 1, limit: 10, onChange: () => { } }}
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </WrapperContent>

            {/* Attribute Modal */}
            <Modal
                title={editingAttribute ? "Sửa thuộc tính" : "Thêm thuộc tính"}
                open={showAttributeModal}
                onCancel={() => setShowAttributeModal(false)}
                onOk={() => {
                    attributeForm.validateFields().then(values => {
                        const options = values.options ? values.options.split(",").map((s: string) => s.trim()) : [];
                        saveAttributeMutation.mutate({ ...values, options });
                    });
                }}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saveAttributeMutation.isPending}
            >
                <Form form={attributeForm} layout="vertical">
                    <Form.Item name="attributeName" label="Tên thuộc tính" rules={[{ required: true }]}>
                        <Input placeholder="VD: Màu sắc, Loại vải, Kiểu dáng..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Measurement Modal */}
            <Modal
                title={editingMeasurement ? "Sửa thông số" : "Thêm thông số"}
                open={showMeasurementModal}
                onCancel={() => setShowMeasurementModal(false)}
                onOk={() => {
                    measurementForm.validateFields().then(values => {
                        const options = values.options ? values.options.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
                        saveMeasurementMutation.mutate({ ...values, options });
                    });
                }}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saveMeasurementMutation.isPending}
            >
                <Form form={measurementForm} layout="vertical">
                    <Form.Item name="measurementName" label="Tên thông số" rules={[{ required: true }]}>
                        <Input placeholder="VD: Vòng ngực, Vòng eo, Size..." />
                    </Form.Item>
                    <Form.Item name="unit" label="Đơn vị" initialValue="cm">
                        <Input placeholder="VD: cm, inch..." />
                    </Form.Item>
                    <Form.Item name="options" label="Các lựa chọn sẵn (phân cách bằng dấu phẩy)" tooltip="Để trống nếu muốn người dùng nhập tự do">
                        <Input placeholder="VD: S, M, L, XL hoặc 38, 39, 40, 41" />
                    </Form.Item>
                    <Form.Item name="isRequired" label="Bắt buộc" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Template Modal */}
            <Modal
                title={editingTemplate ? "Sửa mẫu sản phẩm" : "Thêm mẫu sản phẩm"}
                open={showTemplateModal}
                onCancel={() => setShowTemplateModal(false)}
                onOk={handleSaveTemplate}
                okText="Lưu"
                cancelText="Hủy"
                confirmLoading={saveTemplateMutation.isPending}
                width={600}
            >
                <Form form={templateForm} layout="vertical">
                    <Form.Item name="templateName" label="Tên mẫu" rules={[{ required: true }]}>
                        <Input placeholder="VD: Áo dài đỏ size M" />
                    </Form.Item>

                    {attributes.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium mb-2">Thuộc tính (chọn thuộc tính áp dụng cho mẫu)</h4>
                            <Form.Item name="selectedAttributes">
                                <Checkbox.Group>
                                    <div className="flex flex-wrap gap-2">
                                        {attributes.map(attr => (
                                            <Checkbox key={attr.id} value={attr.attributeName}>
                                                {attr.attributeName}
                                            </Checkbox>
                                        ))}
                                    </div>
                                </Checkbox.Group>
                            </Form.Item>
                        </div>
                    )}

                    {measurements.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium mb-2">Thông số đo</h4>
                            {measurements.map(m => (
                                <Form.Item key={m.id} name={`meas_${m.id}`} label={`${m.measurementName} (${m.unit})`}>
                                    {m.options && m.options.length > 0 ? (
                                        <Select
                                            placeholder={`Chọn hoặc nhập ${m.measurementName}`}
                                            allowClear
                                            showSearch
                                            mode="tags"
                                            tokenSeparators={[',']}
                                            maxCount={1}
                                        >
                                            {m.options.map(opt => (
                                                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <InputNumber placeholder={`Nhập ${m.measurementName}`} style={{ width: "100%" }} />
                                    )}
                                </Form.Item>
                            ))}
                        </div>
                    )}

                    <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
