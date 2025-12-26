"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/utils/format";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, message, Modal, Popconfirm, Space, Switch, Table, Tag } from "antd";
import { useState } from "react";

interface Category {
    id: number;
    category_code: string;
    category_name: string;
    description: string;
    hourly_rate: number;
    is_active: boolean;
}

export default function CategoriesTab() {
    const { can } = usePermissions();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["worker-categories"],
        queryFn: async () => {
            const res = await fetch("/api/production/worker-categories");
            const data = await res.json();
            return data.data || [];
        },
        staleTime: 10 * 60 * 1000, // Cache
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch("/api/production/worker-categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Tạo danh mục thành công");
                queryClient.invalidateQueries({ queryKey: ["worker-categories"] });
                handleCloseModal();
            } else {
                message.error(data.error);
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: number; values: any }) => {
            const res = await fetch(`/api/production/worker-categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Cập nhật thành công");
                queryClient.invalidateQueries({ queryKey: ["worker-categories"] });
                handleCloseModal();
            } else {
                message.error(data.error);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/production/worker-categories/${id}`, {
                method: "DELETE",
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Xóa thành công");
                queryClient.invalidateQueries({ queryKey: ["worker-categories"] });
            } else {
                message.error(data.error);
            }
        },
    });

    const handleOpenModal = (record?: Category) => {
        if (record) {
            setEditingId(record.id);
            form.setFieldsValue({
                categoryCode: record.category_code,
                categoryName: record.category_name,
                description: record.description,
                hourlyRate: record.hourly_rate,
                isActive: record.is_active,
            });
        } else {
            setEditingId(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        form.resetFields();
    };

    const handleSubmit = async (values: any) => {
        if (editingId) {
            updateMutation.mutate({ id: editingId, values });
        } else {
            createMutation.mutate(values);
        }
    };

    const columns = [
        {
            title: "Mã danh mục",
            dataIndex: "category_code",
            key: "category_code",
            width: 120,
        },
        {
            title: "Tên danh mục",
            dataIndex: "category_name",
            key: "category_name",
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Lương/giờ",
            dataIndex: "hourly_rate",
            key: "hourly_rate",
            width: 120,
            render: (value: number) => formatCurrency(value),
        },
        {
            title: "Trạng thái",
            dataIndex: "is_active",
            key: "is_active",
            width: 100,
            render: (value: boolean) => (
                <Tag color={value ? "green" : "red"}>{value ? "Hoạt động" : "Ngừng"}</Tag>
            ),
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 100,
            render: (_: any, record: Category) => (
                <Space>
                    {can("production.worker-categories", "edit") && (
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenModal(record)}
                        />
                    )}
                    {can("production.worker-categories", "delete") && (
                        <Popconfirm
                            title="Xác nhận xóa?"
                            onConfirm={() => deleteMutation.mutate(record.id)}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="mb-4 flex justify-between">
                <h3 className="text-lg font-medium">Danh mục nhân viên sản xuất</h3>
                {can("production.worker-categories", "create") && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                        Thêm danh mục
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={isLoading}
                pagination={false}
            />

            <Modal
                title={editingId ? "Sửa danh mục" : "Thêm danh mục"}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="categoryCode"
                        label="Mã danh mục"
                        rules={[{ required: true, message: "Vui lòng nhập mã" }]}
                    >
                        <Input placeholder="VD: THO_CAT" />
                    </Form.Item>
                    <Form.Item
                        name="categoryName"
                        label="Tên danh mục"
                        rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                    >
                        <Input placeholder="VD: Thợ cắt" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="hourlyRate" label="Lương theo giờ">
                        <InputNumber
                            style={{ width: "100%" }}
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
                            min={0}
                        />
                    </Form.Item>
                    {editingId && (
                        <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" />
                        </Form.Item>
                    )}
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={handleCloseModal}>Hủy</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingId ? "Cập nhật" : "Tạo mới"}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
