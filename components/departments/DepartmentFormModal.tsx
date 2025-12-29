"use client";

import type { CreateDepartmentDto, Department, UpdateDepartmentDto } from "@/services/commonService";
import { Form, Input, Modal } from "antd";
import { useEffect } from "react";

type Props = {
    open: boolean;
    mode: "create" | "edit";
    department: Department | null;
    confirmLoading?: boolean;
    onCancel: () => void;
    onSubmit: (values: CreateDepartmentDto | UpdateDepartmentDto) => void;
};

export default function DepartmentFormModal({
    open,
    mode,
    department,
    confirmLoading = false,
    onCancel,
    onSubmit,
}: Props) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (mode === "edit" && department) {
                form.setFieldsValue({
                    departmentCode: department.departmentCode,
                    departmentName: department.departmentName,
                    description: department.description,
                });
            } else {
                form.resetFields();
            }
        }
    }, [open, mode, department, form]);

    const handleOk = () => {
        form.validateFields().then((values) => {
            onSubmit(values);
        });
    };

    return (
        <Modal
            title={mode === "create" ? "Thêm phòng ban" : "Sửa phòng ban"}
            open={open}
            onOk={handleOk}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            okText={mode === "create" ? "Thêm" : "Cập nhật"}
            cancelText="Hủy"
            confirmLoading={confirmLoading}
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                {mode === "edit" && (
                    <Form.Item
                        name="departmentCode"
                        label="Mã phòng ban"
                        rules={[{ required: true, message: "Vui lòng nhập mã phòng ban" }]}
                    >
                        <Input
                            placeholder="Nhập mã phòng ban"
                            disabled
                        />
                    </Form.Item>
                )}

                <Form.Item
                    name="departmentName"
                    label="Tên phòng ban"
                    rules={[{ required: true, message: "Vui lòng nhập tên phòng ban" }]}
                >
                    <Input placeholder="Nhập tên phòng ban" />
                </Form.Item>

                <Form.Item name="description" label="Mô tả">
                    <Input.TextArea placeholder="Nhập mô tả" rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
