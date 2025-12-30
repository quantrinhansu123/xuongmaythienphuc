'use client';

import { useGetCompany, useUpdateCompany } from '@/hooks/useCompany';
import { usePermissions } from '@/hooks/usePermissions';
import { Button, Card, Form, Input, Spin, message } from 'antd';
import { useEffect } from 'react';

const { TextArea } = Input;

export default function CompanyInfoPage() {
    const { can, isAdmin } = usePermissions();
    const [form] = Form.useForm();

    // Watch form values for preview
    const formValues = Form.useWatch([], form);

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
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form */}
                <div className="lg:col-span-2">
                    <Card title="Thông tin doanh nghiệp" className="shadow-md">
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

                {/* Right Column: Live Preview */}
                <div className="lg:col-span-1">
                    <Card title="Xem trước mẫu in" className="shadow-md sticky top-6">
                        <div className="border bg-white p-4 text-xs shadow-sm min-h-[400px] flex flex-col justify-between" style={{ aspectRatio: '210/297' }}>
                            {/* Header Preview */}
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-1/3">
                                        {formValues?.logoUrl ? (
                                            <img src={formValues.logoUrl} alt="Logo" className="max-w-full h-auto max-h-16 object-contain" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-gray-400 rounded">
                                                Logo
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-2/3 text-right">
                                        <div className="font-bold text-sm uppercase mb-1">{formValues?.companyName || 'Tên Công Ty'}</div>
                                        <div className="text-gray-600 mb-1">{formValues?.address || 'Địa chỉ công ty...'}</div>
                                        <div className="text-gray-600">Tel: {formValues?.phone || '...'}</div>
                                        <div className="text-gray-600">MST: {formValues?.taxCode || '...'}</div>
                                    </div>
                                </div>

                                <div className="text-center border-b pb-4 mb-4">
                                    <h2 className="text-xl font-bold uppercase text-gray-800">
                                        {formValues?.headerText || 'HÓA ĐƠN BÁN HÀNG'}
                                    </h2>
                                    <div className="text-gray-500 italic mt-1">Ngày ... tháng ... năm ...</div>
                                </div>

                                {/* Mock Content */}
                                <div className="space-y-3 opacity-60">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="font-medium">Khách hàng:</span>
                                        <span className="w-2/3 border-b border-dotted border-gray-300"></span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="font-medium">Địa chỉ:</span>
                                        <span className="w-2/3 border-b border-dotted border-gray-300"></span>
                                    </div>

                                    <div className="mt-4 border border-gray-300 rounded p-2 h-24 flex items-center justify-center bg-gray-50">
                                        (Nội dung chi tiết đơn hàng...)
                                    </div>

                                    <div className="flex justify-end mt-2">
                                        <div className="w-1/3 text-center">
                                            <div className="font-medium mb-8">Người lập phiếu</div>
                                            <div>(Ký, họ tên)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Preview */}
                            <div className="text-center text-gray-400 mt-4 pt-2 border-t text-[10px]">
                                {formValues?.footerText ? (
                                    <div className="whitespace-pre-wrap">{formValues.footerText}</div>
                                ) : (
                                    <div className="italic">Nội dung chân trang sẽ hiển thị ở đây...</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 text-center text-gray-500 text-xs">
                            * Đây chỉ là bản xem trước minh họa bố cục
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
