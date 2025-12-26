"use client";

import { useBranches } from "@/hooks/useCommonQuery";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDate } from "@/utils/format";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

interface Worker {
    id: number;
    worker_code: string;
    full_name: string;
    phone: string;
    email: string;
    address: string;
    category_id: number;
    category_name: string;
    branch_id: number;
    branch_name: string;
    hire_date: string;
    hourly_rate: number;
    notes: string;
    is_active: boolean;
}

interface Category {
    id: number;
    category_code: string;
    category_name: string;
    hourly_rate: number;
}

export default function WorkersTab() {
    const { can } = usePermissions();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

    const { data: branches = [] } = useBranches();

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["worker-categories"],
        queryFn: async () => {
            const res = await fetch("/api/production/worker-categories?isActive=true");
            const data = await res.json();
            return data.data || [];
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ["production-workers", search, categoryFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (categoryFilter) params.append("categoryId", categoryFilter);
            const res = await fetch(`/api/production/workers?${params.toString()}`);
            const data = await res.json();
            return data;
        },
        staleTime: 5 * 60 * 1000, // Cache
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch("/api/production/workers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    hireDate: values.hireDate?.format("YYYY-MM-DD"),
                }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Tạo nhân viên thành công");
                queryClient.invalidateQueries({ queryKey: ["production-workers"] });
                handleCloseModal();
            } else {
                message.error(data.error);
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: number; values: any }) => {
            const res = await fetch(`/api/production/workers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    hireDate: values.hireDate?.format("YYYY-MM-DD"),
                }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Cập nhật thành công");
                queryClient.invalidateQueries({ queryKey: ["production-workers"] });
                handleCloseModal();
            } else {
                message.error(data.error);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/production/workers/${id}`, {
                method: "DELETE",
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Xóa thành công");
                queryClient.invalidateQueries({ queryKey: ["production-workers"] });
            } else {
                message.error(data.error);
            }
        },
    });

    const handleOpenModal = (record?: Worker) => {
        if (record) {
            setEditingId(record.id);
            form.setFieldsValue({
                fullName: record.full_name,
                phone: record.phone,
                email: record.email,
                address: record.address,
                categoryId: record.category_id,
                branchId: record.branch_id,
                hireDate: record.hire_date ? dayjs(record.hire_date) : null,
                hourlyRate: record.hourly_rate,
                notes: record.notes,
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

    // Xử lý khi thay đổi danh mục - tự động cập nhật lương
    const handleCategoryChange = (categoryId: number) => {
        const category = categories.find((c) => c.id === categoryId);
        if (category && category.hourly_rate) {
            form.setFieldsValue({ hourlyRate: category.hourly_rate });
        }
    };

    const columns = [
        {
            title: "Mã NV",
            dataIndex: "worker_code",
            key: "worker_code",
            width: 100,
        },
        {
            title: "Họ tên",
            dataIndex: "full_name",
            key: "full_name",
        },
        {
            title: "SĐT",
            dataIndex: "phone",
            key: "phone",
            width: 120,
        },
        {
            title: "Danh mục",
            dataIndex: "category_name",
            key: "category_name",
            render: (value: string) => value || "-",
        },
        {
            title: "Chi nhánh",
            dataIndex: "branch_name",
            key: "branch_name",
            render: (value: string) => value || "-",
        },
        {
            title: "Ngày vào",
            dataIndex: "hire_date",
            key: "hire_date",
            width: 110,
            render: (value: string) => (value ? formatDate(value) : "-"),
        },
        {
            title: "Lương/giờ",
            dataIndex: "hourly_rate",
            key: "hourly_rate",
            width: 110,
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
            render: (_: any, record: Worker) => (
                <Space>
                    {can("production.workers", "edit") && (
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenModal(record)}
                        />
                    )}
                    {can("production.workers", "delete") && (
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
            <div className="mb-4 flex justify-between gap-4">
                <Space>
                    <Input.Search
                        placeholder="Tìm theo tên, mã, SĐT..."
                        allowClear
                        onSearch={setSearch}
                        style={{ width: 250 }}
                    />
                    <Select
                        placeholder="Lọc theo danh mục"
                        allowClear
                        style={{ width: 180 }}
                        onChange={setCategoryFilter}
                        options={categories.map((c) => ({
                            label: c.category_name,
                            value: String(c.id),
                        }))}
                    />
                </Space>
                {can("production.workers", "create") && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                        Thêm nhân viên
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data?.data || []}
                rowKey="id"
                loading={isLoading}
                pagination={{
                    total: data?.total || 0,
                    pageSize: 20,
                    showSizeChanger: false,
                }}
            />

            <Modal
                title={editingId ? "Sửa nhân viên" : "Thêm nhân viên"}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        {editingId && (
                            <Form.Item label="Mã nhân viên">
                                <Input value={form.getFieldValue('workerCode') || data?.data?.find((w: Worker) => w.id === editingId)?.worker_code} disabled />
                            </Form.Item>
                        )}
                        <Form.Item
                            name="fullName"
                            label="Họ tên"
                            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                        >
                            <Input placeholder="Họ và tên" />
                        </Form.Item>
                        <Form.Item name="phone" label="Số điện thoại">
                            <Input placeholder="0123456789" />
                        </Form.Item>
                        <Form.Item name="email" label="Email">
                            <Input placeholder="email@example.com" />
                        </Form.Item>
                        <Form.Item name="categoryId" label="Danh mục">
                            <Select
                                placeholder="Chọn danh mục"
                                allowClear
                                onChange={handleCategoryChange}
                                options={categories.map((c) => ({
                                    label: `${c.category_name} (${formatCurrency(c.hourly_rate)}/giờ)`,
                                    value: c.id,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="branchId" label="Chi nhánh">
                            <Select
                                placeholder="Chọn chi nhánh"
                                allowClear
                                options={branches.map((b: any) => ({
                                    label: b.branchName,
                                    value: b.id,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="hireDate" label="Ngày vào làm">
                            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="hourlyRate" label="Lương theo giờ" tooltip="Tự động theo danh mục, có thể điều chỉnh">
                            <InputNumber
                                style={{ width: "100%" }}
                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                parser={(value) => value!.replace(/\$\s?|(,*)/g, "") as any}
                                min={0}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item name="address" label="Địa chỉ">
                        <Input placeholder="Địa chỉ" />
                    </Form.Item>
                    <Form.Item name="notes" label="Ghi chú">
                        <Input.TextArea rows={2} />
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
