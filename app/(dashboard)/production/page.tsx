"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/utils/format";
import {
    DownloadOutlined,
    SkinOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Tag } from "antd";
import { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { RangePicker } = DatePicker;

export default function ProductionPage() {
    const router = useRouter();
    const { can, loading: permLoading } = usePermissions();
    const {
        query,
        pagination,
        updateQueries,
        reset,
        applyFilter,
        handlePageChange,
    } = useFilter();

    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // Fetch branches for filter
    const { data: branches = [] } = useBranches();

    // Export hook
    const { exportToXlsx } = useFileExport([]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: [
            "production-orders",
            query,
            dateRange?.[0]?.format("YYYY-MM-DD"),
            dateRange?.[1]?.format("YYYY-MM-DD"),
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            // Add existing query params (page, pageSize, search, etc.)
            Object.entries(query).forEach(([key, value]) => {
                if (value) params.append(key, String(value));
            });

            // Add date range params
            if (dateRange?.[0])
                params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
            if (dateRange?.[1])
                params.append("endDate", dateRange[1].format("YYYY-MM-DD"));

            const res = await fetch(`/api/production/orders?${params.toString()}`);
            const data = await res.json();
            return data;
        },
        staleTime: 5 * 60 * 1000, // Cache
        enabled: can("production.orders", "view"),
    });

    const defaultColumns = [
        {
            title: "Mã đơn hàng",
            dataIndex: "orderCode",
            key: "orderCode",
            render: (text: string) => <span className="font-medium">{text}</span>,
        },
        {
            title: "Khách hàng",
            dataIndex: "customerName",
            key: "customerName",
        },
        {
            title: "Chi nhánh",
            dataIndex: "branchName",
            key: "branchName",
            render: (text: string) => text || "-",
        },
        {
            title: "Ngày đặt",
            dataIndex: "orderDate",
            key: "orderDate",
            render: (date: string) => formatDate(date),
        },
        // {
        //     title: "Trạng thái",
        //     dataIndex: "status",
        //     key: "status",
        //     render: (status: string) => {
        //         let color = "default";
        //         let text = status;
        //         switch (status) {
        //             case "PENDING":
        //                 color = "orange";
        //                 text = "Chờ xử lý";
        //                 break;
        //             case "IN_PROGRESS":
        //                 color = "blue";
        //                 text = "Đang sản xuất";
        //                 break;
        //             case "COMPLETED":
        //                 color = "green";
        //                 text = "Hoàn thành";
        //                 break;
        //             case "CANCELLED":
        //                 color = "red";
        //                 text = "Đã hủy";
        //                 break;
        //         }
        //         return <Tag color={color}>{text}</Tag>;
        //     },
        // },
        {
            title: "Công đoạn",
            dataIndex: "currentStep",
            key: "currentStep",
            render: (step: string) => {
                let text = step;
                let color = "default";
                switch (step) {
                    case "MATERIAL_IMPORT":
                        text = "Nhập NVL";
                        color = "orange";
                        break;
                    case "CUTTING":
                        text = "Cắt";
                        color = "blue";
                        break;
                    case "SEWING":
                        text = "May";
                        color = "cyan";
                        break;
                    case "FINISHING":
                        text = "Hoàn thiện";
                        color = "purple";
                        break;
                    case "QC":
                        text = "KCS";
                        color = "geekblue";
                        break;
                    case "WAREHOUSE_IMPORT":
                        text = "Nhập kho";
                        color = "lime";
                        break;
                    case "COMPLETED":
                        text = "Hoàn thành";
                        color = "green";
                        break;
                }
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: "Ngày bắt đầu",
            dataIndex: "startDate",
            key: "startDate",
            render: (date: string) => (date ? formatDate(date) : "-"),
        },
    ];

    const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
        useColumn({ defaultColumns });

    const handleExportExcel = () => {
        if (data?.data) {
            exportToXlsx(data.data, "don-san-xuat");
        }
    };

    const handleReset = () => {
        reset();
        setDateRange(null);
    };

    return (
        <WrapperContent
            title="Đơn sản xuất"
            icon={<SkinOutlined />}
            isLoading={isLoading || isFetching || permLoading}
            isRefetching={isFetching}
            isNotAccessible={!can("production.orders", "view")}
            isEmpty={!data?.data?.length}
            header={{
                buttonBackTo: "/dashboard",
                refetchDataWithKeys: ["production-orders"],
                buttonEnds: [
                    {
                        can: can("production.orders", "view"),
                        type: "default",
                        name: "Xuất Excel",
                        onClick: handleExportExcel,
                        icon: <DownloadOutlined />,
                    },
                ],
                searchInput: {
                    placeholder: "Tìm kiếm đơn sản xuất",
                    filterKeys: ["orderCode", "customerName"],
                },
                filters: {
                    fields: [
                        {
                            type: "custom",
                            name: "dateRange",
                            label: "Thời gian",
                            render: () => (
                                <RangePicker
                                    value={dateRange}
                                    onChange={(dates) => {
                                        setDateRange(dates as [Dayjs, Dayjs]);
                                        // Trigger refetch via query key dependency
                                    }}
                                    format="DD/MM/YYYY"
                                    placeholder={["Từ ngày", "Đến ngày"]}
                                    style={{ width: "100%" }}
                                />
                            ),
                        },
                        {
                            type: "select",
                            name: "branchId",
                            label: "Chi nhánh",
                            options: branches.map((b) => ({
                                label: b.branchName,
                                value: String(b.id),
                            })),
                        },
                        {
                            type: "select",
                            name: "status",
                            label: "Trạng thái",
                            options: [
                                { label: "Chờ xử lý", value: "PENDING" },
                                { label: "Đang sản xuất", value: "IN_PROGRESS" },
                                { label: "Hoàn thành", value: "COMPLETED" },
                                { label: "Đã hủy", value: "CANCELLED" },
                            ],
                        },
                    ],
                    query,
                    onApplyFilter: updateQueries,
                    onReset: handleReset,
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
                dataSource={data?.data || []}
                loading={isLoading || isFetching}
                pagination={{
                    ...pagination,
                    total: data?.total || 0,
                    onChange: handlePageChange,
                }}
                onRowClick={(record) => router.push(`/production/${record.id}`)}
            />
        </WrapperContent>
    );
}
