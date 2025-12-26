import { SettingOutlined } from "@ant-design/icons";
import { Button, List, Spin, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

interface Attribute {
    id: number;
    attribute_name: string;
    attribute_type: string;
    is_required: boolean;
}

interface CategoryAttributesViewerProps {
    categoryId: number;
    onManage: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit: boolean;
    canDelete?: boolean;
}

export default function CategoryAttributesViewer({
    categoryId,
    onManage,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
}: CategoryAttributesViewerProps) {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAttributes = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/categories/${categoryId}/attributes`);
                const data = await res.json();
                if (data.success) {
                    setAttributes(data.data);
                }
            } catch (error) {
                console.error("Error fetching attributes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (categoryId) {
            fetchAttributes();
        }
    }, [categoryId]);

    return (
        <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
                <Typography.Text strong>Thuộc tính ({attributes.length})</Typography.Text>
                <div className="space-x-2">
                    {canEdit && (
                        <Button
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={onManage}
                        >
                            Quản lý
                        </Button>
                    )}
                    {canEdit && onEdit && (
                        <Button
                            size="small"
                            type="primary"
                            onClick={onEdit}
                        >
                            Sửa
                        </Button>
                    )}
                    {canDelete && onDelete && (
                        <Button
                            size="small"
                            danger
                            onClick={onDelete}
                        >
                            Xóa
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-2">
                    <Spin size="small" />
                </div>
            ) : (
                <List
                    size="small"
                    bordered
                    dataSource={attributes}
                    renderItem={(item) => (
                        <List.Item>
                            <div className="flex justify-between w-full">
                                <span>{item.attribute_name}</span>
                                <div className="space-x-2">
                                    <Tag>{item.attribute_type}</Tag>
                                    {item.is_required && <Tag color="red">Bắt buộc</Tag>}
                                </div>
                            </div>
                        </List.Item>
                    )}
                    locale={{ emptyText: "Chưa có thuộc tính nào" }}
                />
            )}
        </div>
    );
}
