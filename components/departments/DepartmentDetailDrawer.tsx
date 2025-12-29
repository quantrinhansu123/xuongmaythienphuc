"use client";

import CommonTable from "@/components/CommonTable";
import { useUsers } from "@/hooks/useUserQuery";
import type { Department } from "@/services/commonService";
import type { User } from "@/services/userService";
import type { TableColumnsType } from "antd";
import { Descriptions, Drawer, Tag, Typography } from "antd";
import { useMemo } from "react";

const { Title } = Typography;

type Props = {
    open: boolean;
    department: Department | null;
    onClose: () => void;
};

export default function DepartmentDetailDrawer({
    open,
    department,
    onClose,
}: Props) {
    // Fetch users filtered by this department when drawer is open and department is selected
    const { data: users = [], isLoading } = useUsers(
        open && department ? { departmentId: department.id } : undefined
    );

    // Filter users client-side as a fallback if needed, but API should handle it.
    // We can just trust the API result.

    const columns: TableColumnsType<User> = useMemo(
        () => [
            {
                title: "Mã NV",
                dataIndex: "userCode",
                key: "userCode",
                width: 100,
            },
            {
                title: "Họ tên",
                dataIndex: "fullName",
                key: "fullName",
            },
            {
                title: "Vai trò",
                dataIndex: "roleName",
                key: "roleName",
                width: 120,
            },
            {
                title: "Trạng thái",
                dataIndex: "isActive",
                key: "isActive",
                width: 100,
                render: (isActive: boolean) => (
                    <Tag color={isActive ? "success" : "error"}>
                        {isActive ? "Hoạt động" : "Khóa"}
                    </Tag>
                ),
            },
        ],
        []
    );

    if (!department) return null;

    return (
        <Drawer
            title="Chi tiết phòng ban"
            open={open}
            onClose={onClose}
            width={720}
            destroyOnClose
        >
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Mã phòng ban">
                    {department.departmentCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên phòng ban">
                    {department.departmentName}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                    {department.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng nhân viên">
                    {department.userCount || 0}
                </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginBottom: 16 }}>
                Danh sách nhân viên ({users.length})
            </Title>

            <CommonTable
                columns={columns}
                dataSource={users}
                loading={isLoading}
                paging={false}
            />
        </Drawer>
    );
}
