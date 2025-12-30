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
import { DatePicker, Select, Tag } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

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



    // Fetch branches for filter
    const { data: branches = [] } = useBranches();

    const { data, isLoading, isFetching } = useQuery({
        queryKey: [
            "production-orders",
            query,
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            // Add existing query params (page, pageSize, search, etc.)
            Object.entries(query).forEach(([key, value]) => {
                if (value) params.append(key, String(value));
            });

            // Add date range params
            if (query.startDate) params.append("startDate", String(query.startDate));
            if (query.endDate) params.append("endDate", String(query.endDate));

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
            title: "Sản phẩm",
            dataIndex: "itemName",
            key: "itemName",
            render: (text: string, record: any) => (
                <div className="flex flex-col">
                    <span className="font-medium text-blue-700">{text}</span>
                </div>
            )
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
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => {
                if (status === "COMPLETED") {
                    return <Tag color="green">✓ Hoàn thành</Tag>;
                }
                return <Tag color="blue">🔄 Đang SX</Tag>;
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

    const exportColumns = [
        { title: "Mã đơn hàng", dataIndex: "orderCode", key: "orderCode" },
        { title: "Khách hàng", dataIndex: "customerName", key: "customerName" },
        { title: "Sản phẩm", dataIndex: "itemName", key: "itemName" },
        { title: "Chi nhánh", dataIndex: "branchName", key: "branchName" },
        { title: "Ngày đặt", dataIndex: "orderDate", key: "orderDate" },
        { title: "Trạng thái", dataIndex: "status", key: "status" },
        { title: "Ngày bắt đầu", dataIndex: "startDate", key: "startDate" },
    ];

    // Export hook
    const { exportToXlsx } = useFileExport(exportColumns);

    const handleExportExcel = () => {
        if (data?.data) {
            const statusMap: Record<string, string> = {
                PENDING: "Chờ xử lý",
                IN_PROGRESS: "Đang sản xuất",
                COMPLETED: "Hoàn thành",
                CANCELLED: "Đã hủy"
            };
            const dataToExport = data.data.map((item: any) => ({
                ...item,
                status: statusMap[item.status] || item.status,
                orderDate: item.orderDate ? formatDate(item.orderDate) : '',
                startDate: item.startDate ? formatDate(item.startDate) : ''
            }));
            exportToXlsx(dataToExport, "don-san-xuat");
        }
    };

    const handleReset = () => {
        reset();
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
                customToolbar: (
                    <div className="flex gap-2 items-center flex-wrap">
                        <RangePicker
                            value={
                                query.startDate && query.endDate
                                    ? [dayjs(query.startDate as string), dayjs(query.endDate as string)]
                                    : null
                            }
                            onChange={(dates) => {
                                updateQueries([
                                    {
                                        key: "startDate",
                                        value: dates?.[0]?.format("YYYY-MM-DD") || "",
                                    },
                                    {
                                        key: "endDate",
                                        value: dates?.[1]?.format("YYYY-MM-DD") || "",
                                    },
                                ]);
                            }}
                            format="DD/MM/YYYY"
                            placeholder={["Từ ngày", "Đến ngày"]}
                            style={{ width: 250 }}
                        />
                        <Select
                            placeholder="Chi nhánh"
                            allowClear
                            style={{ width: 200 }}
                            value={query.branchId?.toString()}
                            onChange={(value) => updateQueries([{ key: "branchId", value: value || "" }])}
                            options={branches.map((b) => ({
                                label: b.branchName,
                                value: String(b.id),
                            }))}
                        />
                        <Select
                            placeholder="Trạng thái"
                            allowClear
                            style={{ width: 150 }}
                            value={query.status}
                            onChange={(value) => updateQueries([{ key: "status", value: value || "" }])}
                            options={[
                                { label: "Chờ xử lý", value: "PENDING" },
                                { label: "Đang sản xuất", value: "IN_PROGRESS" },
                                { label: "Hoàn thành", value: "COMPLETED" },
                                { label: "Đã hủy", value: "CANCELLED" },
                            ]}
                        />
                    </div>
                ),
                filters: {
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
