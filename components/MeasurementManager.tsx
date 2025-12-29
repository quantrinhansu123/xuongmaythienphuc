import { PlusOutlined } from "@ant-design/icons";
import {
    Button,
    Checkbox,
    Form,
    Input,
    List,
    message,
    Modal,
    Space,
    Spin,
    Tag,
    Typography
} from "antd";
import { useEffect, useState } from "react";

interface Measurement {
    id: number;
    measurement_name: string;
    unit: string;
    is_required: boolean;
}

interface MeasurementManagerProps {
    categoryId: number | null;
    categoryName?: string;
    open: boolean;
    onClose: () => void;
}

export default function MeasurementManager({
    categoryId,
    categoryName,
    open,
    onClose,
}: MeasurementManagerProps) {
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchMeasurements = async () => {
        if (!categoryId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/products/item-categories/${categoryId}/measurements`);
            const data = await res.json();
            if (data.success) {
                setMeasurements(data.data);
            }
        } catch (error) {
            message.error("Lỗi khi tải thông số");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && categoryId) {
            fetchMeasurements();
        }
    }, [open, categoryId]);

    const handleAdd = async (values: any) => {
        if (!categoryId) return;
        try {
            const res = await fetch(`/api/products/item-categories/${categoryId}/measurements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    measurementName: values.measurementName,
                    unit: values.unit,
                    isRequired: values.isRequired,
                }),
            });
            const data = await res.json();
            if (data.success) {
                message.success("Thêm thông số thành công");
                form.resetFields();
                fetchMeasurements();
            } else {
                message.error(data.error || "Lỗi khi thêm thông số");
            }
        } catch (error) {
            message.error("Lỗi khi thêm thông số");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/products/item-categories/${categoryId}/measurements?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                message.success("Xóa thông số thành công");
                fetchMeasurements();
            } else {
                message.error(data.error || "Lỗi khi xóa thông số");
            }
        } catch (error) {
            message.error("Lỗi khi xóa thông số");
        }
    };

    return (
        <Modal
            title={`Quản lý thông số đo - ${categoryName || ""}`}
            open={open}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md border">
                    <Typography.Text strong className="block mb-2">
                        Thêm thông số mới
                    </Typography.Text>
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={handleAdd}
                        initialValues={{ isRequired: false }}
                    >
                        <Form.Item
                            name="measurementName"
                            rules={[{ required: true, message: "Nhập tên" }]}
                            style={{ flex: 1 }}
                        >
                            <Input placeholder="Tên (VD: Vòng ngực)" />
                        </Form.Item>
                        <Form.Item
                            name="unit"
                            style={{ width: 120 }}
                        >
                            <Input placeholder="Đơn vị (VD: cm)" />
                        </Form.Item>
                        <Form.Item name="isRequired" valuePropName="checked">
                            <Checkbox>Bắt buộc</Checkbox>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                                Thêm
                            </Button>
                        </Form.Item>
                    </Form>
                </div>

                <div>
                    <Typography.Text strong className="block mb-2">
                        Danh sách thông số
                    </Typography.Text>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spin />
                        </div>
                    ) : (
                        <List
                            bordered
                            dataSource={measurements}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="delete"
                                            type="text"
                                            danger
                                            size="small"
                                            onClick={() => {
                                                Modal.confirm({
                                                    title: "Xác nhận xóa",
                                                    content: "Bạn có chắc chắn muốn xóa thông số này?",
                                                    onOk: () => handleDelete(item.id),
                                                });
                                            }}
                                        >
                                            Xóa
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space>
                                                {item.measurement_name}
                                                {item.unit && <Tag>{item.unit}</Tag>}
                                                {item.is_required && <Tag color="red">Bắt buộc</Tag>}
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: "Chưa có thông số nào" }}
                        />
                    )}
                </div>
            </div>
        </Modal>
    );
}
