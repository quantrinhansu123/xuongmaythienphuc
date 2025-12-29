"use client";

import CommonTable from "@/components/CommonTable";
import DepartmentDetailDrawer from "@/components/departments/DepartmentDetailDrawer";
import DepartmentFormModal from "@/components/departments/DepartmentFormModal";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
    departmentService,
    type CreateDepartmentDto,
    type Department,
    type UpdateDepartmentDto,
} from "@/services/commonService";
import {
    DeleteOutlined,
    EditOutlined,
    MoreOutlined,
    PlusOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MenuProps, TableColumnsType } from "antd";
import { App, Button, Dropdown } from "antd";
import { useState } from "react";

export default function DepartmentsPage() {
    const { can } = usePermissions();
    const queryClient = useQueryClient();
    const { applyFilter, updateQueries, reset, query } = useFilter();
    const { modal, message } = App.useApp();

    const { data: departments = [], isLoading, isFetching } = useQuery({
        queryKey: ["departments"],
        queryFn: departmentService.getAll,
        staleTime: 10 * 60 * 1000,
    });

    const filteredDepartments = applyFilter(departments); // Applying filter

    const createMutation = useMutation({
        mutationFn: departmentService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            message.success("Thêm phòng ban thành công");
            setModalVisible(false);
        },
        onError: (error: Error) => {
            message.error(error.message || "Lỗi khi thêm phòng ban");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentDto }) =>
            departmentService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            message.success("Cập nhật phòng ban thành công");
            setModalVisible(false);
        },
        onError: (error: Error) => {
            message.error(error.message || "Lỗi khi cập nhật phòng ban");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: departmentService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            message.success("Xóa phòng ban thành công");
        },
        onError: (error: Error) => {
            message.error(error.message || "Lỗi khi xóa phòng ban");
        },
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");

    const handleView = (dept: Department) => {
        setSelectedDepartment(dept);
        setDrawerVisible(true);
    };

    const handleCreate = () => {
        setModalMode("create");
        setSelectedDepartment(null);
        setModalVisible(true);
    };

    const handleEdit = (dept: Department) => {
        // Prevent bubbling if called from row click?
        // Actually this is usually from dropdown which stops propagation automatically or we handle it.
        // But for safety:
        setModalMode("edit");
        setSelectedDepartment(dept);
        setModalVisible(true);
    };

    const handleDelete = (id: number) => {
        modal.confirm({
            title: "Xác nhận xóa",
            content: "Bạn có chắc muốn xóa phòng ban này? Hành động này không thể hoàn tác.",
            okText: "Xóa",
            cancelText: "Hủy",
            okButtonProps: { danger: true },
            onOk: () => deleteMutation.mutate(id),
        });
    };

    const handleModalSubmit = (values: CreateDepartmentDto | UpdateDepartmentDto) => {
        if (modalMode === "create") {
            createMutation.mutate(values as CreateDepartmentDto);
        } else if (selectedDepartment) {
            updateMutation.mutate({ id: selectedDepartment.id, data: values as UpdateDepartmentDto });
        }
    };

    const columnsAll: TableColumnsType<Department> = [
        {
            title: "Mã phòng ban",
            dataIndex: "departmentCode",
            key: "departmentCode",
            width: 150,
            fixed: "left",
        },
        {
            title: "Tên phòng ban",
            dataIndex: "departmentName",
            key: "departmentName",
            width: 250,
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Số lượng nhân viên",
            dataIndex: "userCount",
            key: "userCount",
            width: 150,
            align: "center",
            render: (count: number) => count || 0,
        },
        {
            title: "Thao tác",
            key: "action",
            width: 100,
            fixed: "right",
            render: (_: unknown, record: Department) => {
                const menuItems: MenuProps['items'] = [];

                if (can("admin.users", "edit")) {
                    menuItems.push({
                        key: "edit",
                        label: "Sửa",
                        icon: <EditOutlined />,
                        onClick: ({ domEvent }) => {
                            domEvent.stopPropagation();
                            handleEdit(record);
                        },
                    });
                }

                if (can("admin.users", "edit")) { // Assuming same permission for delete for now
                    menuItems.push({
                        key: "delete",
                        label: "Xóa",
                        icon: <DeleteOutlined />,
                        onClick: ({ domEvent }) => {
                            domEvent.stopPropagation();
                            handleDelete(record.id);
                        },
                    });
                }

                if (menuItems.length === 0) return null;

                return (
                    <Dropdown
                        menu={{ items: menuItems }}
                        trigger={["click"]}
                        placement="bottomLeft"
                    >
                        <Button
                            type="text"
                            icon={<MoreOutlined />}
                            size="small"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                    </Dropdown>
                );
            },
        },
    ];

    const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
        useColumn({ defaultColumns: columnsAll });

    return (
        <>
            <WrapperContent<Department>
                title="Quản lý phòng ban"
                isNotAccessible={!can("admin.users", "view")}
                isLoading={isLoading}
                header={{
                    refetchDataWithKeys: ["departments"],
                    buttonEnds: can("admin.users", "edit") ? [
                        {
                            type: "primary",
                            name: "Thêm",
                            onClick: handleCreate,
                            icon: <PlusOutlined />,
                        },
                    ] : undefined,
                    searchInput: {
                        placeholder: "Tìm kiếm phòng ban...",
                        filterKeys: ["departmentName", "departmentCode", "description"],
                    },
                    filters: {
                        query,
                        onApplyFilter: (params) => updateQueries(params),
                        onReset: reset,
                    },
                    columnSettings: {
                        columns: columnsCheck,
                        onChange: (cols) => updateColumns(cols),
                        onReset: () => resetColumns(),
                    },
                }}
            >
                <CommonTable
                    columns={getVisibleColumns()}
                    dataSource={filteredDepartments} // Note: filtering usually happens via useFilter applied to dataSource or API.
                    // If useFilter is used: dataSource={applyFilter(departments)}
                    // I need to import applyFilter from useFilter.
                    loading={isLoading || isFetching || deleteMutation.isPending}
                    onRowClick={handleView}
                />
            </WrapperContent>

            <DepartmentDetailDrawer
                open={drawerVisible}
                department={selectedDepartment}
                onClose={() => setDrawerVisible(false)}
            />

            <DepartmentFormModal
                open={modalVisible}
                mode={modalMode}
                department={selectedDepartment}
                confirmLoading={createMutation.isPending || updateMutation.isPending}
                onCancel={() => setModalVisible(false)}
                onSubmit={handleModalSubmit}
            />
        </>
    );
}
