"use client";

import CommonTable from "@/components/CommonTable";
import CustomerGroupFormModal, {
    type CustomerGroupFormValues,
} from "@/components/customers/CustomerGroupFormModal";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import {
    CUSTOMER_GROUP_KEYS,
    useCreateCustomerGroup,
    useCustomerGroups,
    useDeleteCustomerGroup,
    useUpdateCustomerGroup,
} from "@/hooks/useCustomerGroupQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { CustomerGroup } from "@/services/customerGroupService";
import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusOutlined,
    UserOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions, Divider, Spin, Table } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Component hiển thị chi tiết nhóm KH + danh sách khách hàng
function CustomerGroupDrawerDetails({
    data,
    onClose,
    onEdit,
    onDelete,
    canEdit,
    canDelete
}: {
    data: CustomerGroup;
    onClose: () => void;
    onEdit: (group: CustomerGroup) => void;
    onDelete: (id: number) => void;
    canEdit: boolean;
    canDelete: boolean;
}) {
    const router = useRouter();

    // Fetch customers in this group
    const { data: customers = [], isLoading } = useQuery({
        queryKey: ["customers-in-group", data.id],
        queryFn: async () => {
            const res = await fetch(`/api/sales/customers?customerGroupId=${data.id}`);
            const result = await res.json();
            return result.success ? result.data || [] : [];
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!data.id,
    });

    return (
        <>
            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Mã nhóm">
                    <span className="font-mono">{data.groupCode}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Tên nhóm">
                    <span className="font-medium">{data.groupName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Hệ số giá mặc định">
                    <span className="font-semibold text-blue-600">
                        {data.priceMultiplier}%
                    </span>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                    {data.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                    {new Date(data.createdAt).toLocaleString("vi-VN")}
                </Descriptions.Item>
            </Descriptions>

            <Divider className="my-3" />

            <div className="flex items-center gap-2 mb-2">
                <UserOutlined className="text-blue-500" />
                <span className="font-semibold">Khách hàng ({customers.length})</span>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4"><Spin /></div>
            ) : customers.length === 0 ? (
                <div className="text-gray-400 text-center py-4 border border-dashed rounded">
                    Chưa có khách hàng nào thuộc nhóm này
                </div>
            ) : (
                <Table
                    dataSource={customers}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 5, size: "small" }}
                    scroll={{ y: 200 }}
                    onRow={(record: { id: number }) => ({
                        onClick: () => {
                            onClose();
                            router.push(`/sales/customers/${record.id}`);
                        },
                        style: { cursor: "pointer" },
                    })}
                    columns={[
                        {
                            title: "Mã KH",
                            dataIndex: "customerCode",
                            width: 100,
                            render: (val: string) => <span className="font-mono text-xs">{val}</span>,
                        },
                        {
                            title: "Tên khách hàng",
                            dataIndex: "customerName",
                            render: (val: string) => <span className="font-medium">{val}</span>,
                        },
                        {
                            title: "SĐT",
                            dataIndex: "phone",
                            width: 120,
                        },
                    ]}
                />
            )}

            <div className="flex gap-2 justify-end mt-4">
                {canEdit && (
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => {
                            onClose();
                            onEdit(data);
                        }}
                    >
                        Sửa
                    </Button>
                )}
                {canDelete && (
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            onClose();
                            onDelete(data.id);
                        }}
                    >
                        Xóa
                    </Button>
                )}
            </div>
        </>
    );
}


export default function CustomerGroupsPage() {
    const { can } = usePermissions();
    const { modal, message } = App.useApp();

    // Filter hook
    const {
        query,
        pagination,
        updateQueries,
        reset,
        applyFilter,
        handlePageChange,
    } = useFilter();

    // React Query hooks
    const {
        data: groups = [],
        isLoading: groupsLoading,
        isFetching: groupsFetching,
    } = useCustomerGroups();
    const deleteMutation = useDeleteCustomerGroup();
    const createMutation = useCreateCustomerGroup();
    const updateMutation = useUpdateCustomerGroup();

    // Modal and form state
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);

    // File export hook
    const { exportToXlsx } = useFileExport([]);

    // Event handlers
    const handleCreate = () => {
        setEditingGroup(null);
        setShowModal(true);
    };

    const handleEdit = (group: CustomerGroup) => {
        setEditingGroup(group);
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        modal.confirm({
            title: "Xác nhận xóa",
            content: "Bạn có chắc chắn muốn xóa nhóm khách hàng này?",
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () => {
                        message.success({
                            content: "Xóa nhóm khách hàng thành công",
                        });
                    },
                    onError: (error: Error) => {
                        modal.error({
                            title: "Lỗi",
                            content: error.message || "Có lỗi xảy ra khi xóa nhóm khách hàng",
                        });
                    },
                });
            },
        });
    };

    const handleSubmit = async (values: CustomerGroupFormValues) => {
        if (editingGroup) {
            updateMutation.mutate(
                { id: editingGroup.id, data: values },
                {
                    onSuccess: () => {
                        message.success({
                            content: "Cập nhật nhóm khách hàng thành công",
                        });
                        setShowModal(false);
                        setEditingGroup(null);
                    },
                    onError: (error: Error) => {
                        message.error({
                            content:
                                error.message || "Có lỗi xảy ra khi cập nhật nhóm khách hàng",
                        });
                    },
                }
            );
        } else {
            createMutation.mutate(values, {
                onSuccess: () => {
                    message.success({
                        content: "Thêm nhóm khách hàng thành công",
                    });
                    setShowModal(false);
                },
                onError: (error: Error) => {
                    message.error({
                        content: error.message || "Có lỗi xảy ra khi thêm nhóm khách hàng",
                    });
                },
            });
        }
    };

    const handleExportExcel = () => {
        const filteredData = applyFilter(groups);
        exportToXlsx(filteredData, "nhom_khach_hang");
    };

    const handleImportExcel = () => {
        modal.info({
            title: "Nhập Excel",
            content: "Tính năng nhập Excel đang được phát triển",
        });
    };

    // Apply client-side filtering
    const filteredGroups = applyFilter(groups);

    // Column definitions
    const defaultColumns: TableColumnsType<CustomerGroup> = [
        {
            title: "Mã nhóm",
            dataIndex: "groupCode",
            key: "groupCode",
            width: 150,
            fixed: "left",
        },
        {
            title: "Tên nhóm",
            dataIndex: "groupName",
            key: "groupName",
            width: 200,
        },
        {
            title: "Hệ số giá",
            dataIndex: "priceMultiplier",
            key: "priceMultiplier",
            width: 130,
            align: "right",
            render: (value: number) => (
                <span className="font-semibold text-blue-600">{value}%</span>
            ),
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
            width: 300,
            render: (text: string) => text || "-",
        },
        {
            title: "Số khách hàng",
            dataIndex: "customerCount",
            key: "customerCount",
            width: 130,
            align: "right",
            render: (count: number) => (
                <span className="font-medium">{count || 0}</span>
            ),
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 150,
            fixed: "right",
            render: (_, record) => (
                <TableActions
                    onEdit={() => handleEdit(record)}
                    onDelete={() => handleDelete(record.id)}
                    canEdit={can("sales.customers", "edit")}
                    canDelete={can("sales.customers", "delete")}
                />
            ),
        },
    ];

    const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
        useColumn({ defaultColumns });

    return (
        <>
            <WrapperContent<CustomerGroup>
                title="Nhóm khách hàng"
                isNotAccessible={!can("sales.customers", "view")}
                isLoading={groupsLoading}
                isRefetching={groupsFetching}
                isEmpty={!groups?.length}
                header={{
                    refetchDataWithKeys: CUSTOMER_GROUP_KEYS.all,
                    buttonEnds: [
                        {
                            can: can("sales.customers", "create"),
                            type: "primary",
                            name: "Thêm",
                            onClick: handleCreate,
                            icon: <PlusOutlined />,
                        },
                        {
                            can: can("sales.customers", "view"),
                            type: "default",
                            name: "Xuất Excel",
                            onClick: handleExportExcel,
                            icon: <DownloadOutlined />,
                        },
                    ],
                    searchInput: {
                        placeholder: "Tìm kiếm nhóm khách hàng",
                        filterKeys: ["groupName", "groupCode", "description"],
                    },
                    filters: {
                        fields: [
                            {
                                type: "select",
                                name: "priceMultiplier",
                                label: "Hệ số giá",
                                options: [
                                    { label: "Không giảm (0%)", value: "0" },
                                    { label: "Giảm 5%", value: "5" },
                                    { label: "Giảm 10%", value: "10" },
                                    { label: "Giảm 15%", value: "15" },
                                    { label: "Giảm 20%", value: "20" },
                                ],
                            },
                        ],
                        query,
                        onApplyFilter: updateQueries,
                        onReset: reset,
                    },
                    columnSettings: {
                        columns: columnsCheck,
                        onChange: updateColumns,
                        onReset: resetColumns,
                    },
                }}
            >
                <CommonTable
                    columns={getVisibleColumns()}
                    dataSource={filteredGroups}
                    loading={groupsLoading || groupsFetching}
                    pagination={{ ...pagination, onChange: handlePageChange }}
                    rank={true}
                    DrawerDetails={({ data, onClose }) => (
                        <CustomerGroupDrawerDetails
                            data={data}
                            onClose={onClose}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            canEdit={can("sales.customers", "edit")}
                            canDelete={can("sales.customers", "delete")}
                        />
                    )}
                />
            </WrapperContent>

            <CustomerGroupFormModal
                open={showModal}
                mode={editingGroup ? "edit" : "create"}
                group={editingGroup}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                onCancel={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />
        </>
    );
}