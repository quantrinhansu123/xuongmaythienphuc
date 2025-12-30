'use client';

import { useGetCompany, useUpdateCompany } from '@/hooks/useCompany';
import { usePermissions } from '@/hooks/usePermissions';
import { Button, Card, Form, Input, Spin, message } from 'antd';
import { useEffect } from 'react';

const { TextArea } = Input;

export default function CompanyInfoPage() {
    const { can, isAdmin } = usePermissions();
    const [form] = Form.useForm();

    // Use existing hooks
    const { data, isLoading } = useGetCompany();
    const mutation = useUpdateCompany();

    useEffect(() => {
        if (data) {
            form.setFieldsValue(data);
        }
    }, [data, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            mutation.mutate(values, {
                onSuccess: () => {
                    message.success('Cập nhật thông tin thành công');
                },
                onError: (error: any) => {
                    message.error(error?.message || 'Có lỗi xảy ra');
                }
            });
        } catch {
            // validation error
        }
    };

    if (!isAdmin && !can('admin.company-info', 'view')) {
        return <div className="p-6">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="p-6">
            <Card title="Thông tin doanh nghiệp" className="max-w-3xl mx-auto shadow-md">
                {isLoading ? (
                    <div className="text-center p-10">
                        <Spin size="large" />
                    </div>
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        disabled={!isAdmin && !can('admin.company-info', 'edit')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Form.Item
                                name="companyName"
                                label="Tên công ty"
                                rules={[{ required: true, message: "Vui lòng nhập tên công ty" }]}
                                className="md:col-span-2"
                            >
                                <Input placeholder="Nhập tên công ty" />
                            </Form.Item>

                            <Form.Item name="taxCode" label="Mã số thuế">
                                <Input placeholder="Nhập mã số thuế" />
                            </Form.Item>

                            <Form.Item name="phone" label="Số điện thoại">
                                <Input placeholder="Nhập số điện thoại" />
                            </Form.Item>

                            <Form.Item name="email" label="Email">
                                <Input type="email" placeholder="Nhập email" />
                            </Form.Item>

                            <Form.Item name="address" label="Địa chỉ" className="md:col-span-2">
                                <TextArea rows={2} placeholder="Nhập địa chỉ" />
                            </Form.Item>

                            <div className="md:col-span-2 border-t my-2 pt-4">
                                <h3 className="mb-4 font-medium text-gray-700">Cấu hình hóa đơn / In ấn</h3>
                            </div>

                            <Form.Item name="headerText" label="Tiêu đề hóa đơn">
                                <Input placeholder="VD: HÓA ĐƠN BÁN HÀNG" />
                            </Form.Item>

                            <Form.Item name="logoUrl" label="URL Logo">
                                <Input placeholder="Nhập URL logo công ty" />
                            </Form.Item>

                            <Form.Item name="footerText" label="Chân trang hóa đơn" className="md:col-span-2">
                                <TextArea rows={2} placeholder="Nội dung chân trang" />
                            </Form.Item>
                        </div>

                        <div className="flex justify-end mt-4 border-t pt-4">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={mutation.isPending}
                                disabled={!isAdmin && !can('admin.company-info', 'edit')}
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </Form>
                )}
            </Card>
        </div>
    );
}
