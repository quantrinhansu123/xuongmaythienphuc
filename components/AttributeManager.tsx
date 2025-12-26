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

interface Attribute {
    id: number;
    attribute_name: string;
    attribute_type: string;
    is_required: boolean;
}

interface AttributeManagerProps {
    categoryId: number | null;
    categoryName?: string;
    open: boolean;
    onClose: () => void;
}

export default function AttributeManager({
    categoryId,
    categoryName,
    open,
    onClose,
}: AttributeManagerProps) {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchAttributes = async () => {
        if (!categoryId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/categories/${categoryId}/attributes`);
            const data = await res.json();
            if (data.success) {
                setAttributes(data.data);
            }
        } catch (error) {
            message.error("Lỗi khi tải thuộc tính");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && categoryId) {
            fetchAttributes();
        }
    }, [open, categoryId]);

    const handleAddAttribute = async (values: any) => {
        if (!categoryId) return;
        try {
            const res = await fetch(`/api/categories/${categoryId}/attributes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attributeName: values.attributeName,
                    attributeType: values.attributeType,
                    isRequired: values.isRequired,
                }),
            });
            const data = await res.json();
            if (data.success) {
                message.success("Thêm thuộc tính thành công");
                form.resetFields();
                fetchAttributes();
            } else {
                message.error(data.error || "Lỗi khi thêm thuộc tính");
            }
        } catch (error) {
            message.error("Lỗi khi thêm thuộc tính");
        }
    };

    const handleDeleteAttribute = async (id: number) => {
        try {
            const res = await fetch(`/api/categories/${categoryId}/attributes?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                message.success("Xóa thuộc tính thành công");
                fetchAttributes();
            } else {
                message.error(data.error || "Lỗi khi xóa thuộc tính");
            }
        } catch (error) {
            message.error("Lỗi khi xóa thuộc tính");
        }
    };

    const handleUpdateAttribute = async (id: number, values: any) => {
        try {
            const res = await fetch(`/api/categories/${categoryId}/attributes?id=${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (data.success) {
                message.success("Cập nhật thuộc tính thành công");
                fetchAttributes();
            } else {
                message.error(data.error || "Lỗi khi cập nhật thuộc tính");
            }
        } catch (error) {
            message.error("Lỗi khi cập nhật thuộc tính");
        }
    };

    return (
        <Modal
            title={`Quản lý thuộc tính - ${categoryName || ""}`}
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md border">
                    <Typography.Text strong className="block mb-2">
                        Thêm thuộc tính mới
                    </Typography.Text>
                    <Form
                        form={form}
                        layout="inline"
                        onFinish={handleAddAttribute}
                        initialValues={{ attributeType: "TEXT", isRequired: false }}
                    >
                        <Form.Item
                            name="attributeName"
                            rules={[{ required: true, message: "Nhập tên" }]}
                            style={{ flex: 1 }}
                        >
                            <Input placeholder="Tên thuộc tính (VD: Size, Màu)" />
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
                        Danh sách thuộc tính
                    </Typography.Text>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spin />
                        </div>
                    ) : (
                        <List
                            bordered
                            dataSource={attributes}
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
                                                    content: "Bạn có chắc chắn muốn xóa thuộc tính này?",
                                                    onOk: () => handleDeleteAttribute(item.id),
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
                                                {item.attribute_name}
                                                {item.is_required && <Tag color="red">Bắt buộc</Tag>}
                                            </Space>
                                        }
                                        description={`Kiểu: ${item.attribute_type}`}
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: "Chưa có thuộc tính nào" }}
                        />
                    )}
                </div>
            </div>
        </Modal>
    );
}
