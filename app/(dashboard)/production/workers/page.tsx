"use client";

import CategoriesTab from "@/app/(dashboard)/production/workers/CategoriesTab";
import WorkersTab from "@/app/(dashboard)/production/workers/WorkersTab";
import { usePermissions } from "@/hooks/usePermissions";
import { TagsOutlined, TeamOutlined } from "@ant-design/icons";
import { Spin, Tabs } from "antd";
import { useState } from "react";

export default function ProductionWorkersPage() {
    const { can, loading: permLoading } = usePermissions();
    const [activeTab, setActiveTab] = useState("workers");

    if (permLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    const items = [
        {
            key: "workers",
            label: (
                <span>
                    <TeamOutlined /> Nhân viên sản xuất
                </span>
            ),
            children: <WorkersTab />,
            disabled: !can("production.workers", "view"),
        },
        {
            key: "categories",
            label: (
                <span>
                    <TagsOutlined /> Danh mục nhân viên
                </span>
            ),
            children: <CategoriesTab />,
            disabled: !can("production.worker-categories", "view"),
        },
    ];

    return (
        <div className="p-6">
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={items}
                size="large"
            />
        </div>
    );
}
