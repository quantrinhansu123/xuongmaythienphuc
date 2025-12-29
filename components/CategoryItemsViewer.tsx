"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Space, Table, Tag } from "antd";

interface CategoryItemsViewerProps {
    categoryId: number | null;
    onEdit?: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

interface Item {
    id: number;
    itemCode: string;
    itemName: string;
    unit: string;
    costPrice?: number;
    isActive: boolean;
}

export default function CategoryItemsViewer({
    categoryId,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
}: CategoryItemsViewerProps) {
    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["category-items", categoryId],
        queryFn: async () => {
            if (!categoryId) return [];
            const res = await fetch(`/api/products/items?categoryId=${categoryId}`);
            const data = await res.json();
            return data.success ? data.data || [] : [];
        },
        enabled: !!categoryId,
    });

    const columns = [
        {
            title: "Mã",
            dataIndex: "itemCode",
            key: "itemCode",
            width: 100,
            render: (text: string) => (
                <Tag color="blue" style={{ fontFamily: "monospace" }}>
                    {text}
                </Tag>
            ),
        },
        {
            title: "Tên hàng hoá",
            dataIndex: "itemName",
            key: "itemName",
        },
        {
            title: "ĐVT",
            dataIndex: "unit",
            key: "unit",
            width: 80,
        },
        {
            title: "Trạng thái",
            dataIndex: "isActive",
            key: "isActive",
            width: 100,
            render: (val: boolean) => (
                <Tag color={val ? "success" : "default"}>
                    {val ? "Hoạt động" : "Ngừng"}
                </Tag>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-700">
                    Danh sách hàng hoá ({items.length})
                </h4>
                <Space>
                    {canEdit && onEdit && (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={onEdit}
                            size="small"
                        >
                            Sửa
                        </Button>
                    )}
                    {canDelete && onDelete && (
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={onDelete}
                            size="small"
                        >
                            Xóa
                        </Button>
                    )}
                </Space>
            </div>

            {items.length === 0 && !isLoading ? (
                <Empty
                    description="Chưa có hàng hoá nào trong danh mục này"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={items}
                    rowKey="id"
                    size="small"
                    loading={isLoading}
                    pagination={{ pageSize: 5, size: "small" }}
                    scroll={{ x: 400 }}
                />
            )}
        </div>
    );
}
