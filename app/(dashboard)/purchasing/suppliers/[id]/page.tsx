'use client';

import CommonTable from '@/components/CommonTable';
import WrapperContent from '@/components/WrapperContent';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { ArrowLeftOutlined, EditOutlined, EnvironmentOutlined, FileTextOutlined, HistoryOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Card, Descriptions, Statistic, Tabs, Tag } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Supplier {
    id: number;
    supplierCode: string;
    supplierName: string;
    phone: string;
    email: string;
    address: string;
    groupName: string;
    debtAmount: number;
    isActive: boolean;
    supplierGroupId?: number;
}

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const isMobile = useIsMobile();
    const { can, loading: permLoading } = usePermissions();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('orders');

    const supplierId = params?.id ? parseInt(String(params.id)) : null;

    useEffect(() => {
        if (!permLoading && can('purchasing.suppliers', 'view') && supplierId) {
            fetchSupplierDetails();
            fetchSupplierOrders();
            fetchSupplierItems();
        } else if (!permLoading && !supplierId) {
            setLoading(false);
        }
    }, [permLoading, supplierId]);

    const fetchSupplierDetails = async () => {
        try {
            const res = await fetch(`/api/purchasing/suppliers/${supplierId}`);
            const data = await res.json();
            if (data.success) {
                setSupplier(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplierOrders = async () => {
        try {
            const res = await fetch(`/api/purchasing/orders?supplierId=${supplierId}`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSupplierItems = async () => {
        try {
            const res = await fetch(`/api/purchasing/suppliers/${supplierId}/items`);
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = () => {
        alert('Chức năng sửa chi tiết đang được phát triển');
    };

    if (loading) return <div className="flex items-center justify-center min-h-[200px]">Đang tải...</div>;
    if (!supplier) return <div className="flex items-center justify-center min-h-[200px]">Không tìm thấy nhà cung cấp</div>;

    // Order columns
    const orderColumns = [
        {
            title: 'Mã đơn',
            dataIndex: 'poCode',
            key: 'poCode',
            width: 120,
            render: (text: string) => <span className="font-mono font-medium text-blue-600">{text}</span>
        },
        {
            title: 'Ngày đặt',
            dataIndex: 'orderDate',
            key: 'orderDate',
            width: 100,
            render: (text: string) => new Date(text).toLocaleDateString('vi-VN')
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 120,
            align: 'right' as const,
            render: (val: number) => <span className="font-medium">{formatCurrency(val)}</span>
        },
        {
            title: 'Đã TT',
            dataIndex: 'paidAmount',
            key: 'paidAmount',
            width: 100,
            align: 'right' as const,
            render: (val: number) => <span className="text-green-600">{formatCurrency(val)}</span>
        },
        {
            title: 'Còn nợ',
            key: 'remaining',
            width: 100,
            align: 'right' as const,
            render: (_: unknown, record: any) => {
                const remaining = record.totalAmount - (record.paidAmount || 0);
                return remaining > 0 ? <span className="text-red-600 font-medium">{formatCurrency(remaining)}</span> : <span className="text-gray-400">0</span>;
            }
        },
        {
            title: 'TT',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            align: 'center' as const,
            render: (status: string) => (
                <Tag color={
                    status === 'PENDING' ? 'gold' :
                        status === 'CONFIRMED' ? 'blue' :
                            status === 'DELIVERED' ? 'green' : 'red'
                }>
                    {status === 'PENDING' ? 'Chờ' :
                        status === 'CONFIRMED' ? 'Xác nhận' :
                            status === 'DELIVERED' ? 'Giao' :
                                status === 'CANCELLED' ? 'Hủy' : status}
                </Tag>
            )
        }
    ];

    // Item columns
    const itemColumns = [
        {
            title: 'Mã SP',
            dataIndex: 'itemCode',
            key: 'itemCode',
            width: 100,
            render: (text: string) => <span className="font-mono">{text || '-'}</span>
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'itemName',
            key: 'itemName',
            render: (text: string) => <span className="font-medium">{text}</span>
        },
        {
            title: 'ĐVT',
            dataIndex: 'unit',
            key: 'unit',
            width: 70,
            align: 'center' as const,
            render: (text: string) => <Tag>{text}</Tag>
        },
        {
            title: 'Giá nhập',
            dataIndex: 'lastPrice',
            key: 'lastPrice',
            width: 100,
            align: 'right' as const,
            render: (val: number) => formatCurrency(val)
        },
        {
            title: 'Tổng SL',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
            width: 80,
            align: 'right' as const,
            render: (val: number) => val?.toLocaleString('vi-VN') || 0
        }
    ];

    return (
        <WrapperContent
            title={supplier.supplierName}
            isNotAccessible={!can('purchasing.suppliers', 'view')}
            header={{
                buttonEnds: [
                    {
                        can: true,
                        type: 'default',
                        name: 'Quay lại',
                        icon: <ArrowLeftOutlined />,
                        onClick: () => router.push('/purchasing/suppliers'),
                    },
                    {
                        can: can('purchasing.suppliers', 'edit'),
                        type: 'primary',
                        name: 'Sửa',
                        icon: <EditOutlined />,
                        onClick: handleEdit,
                    },
                ]
            }}
        >
            <div className="space-y-4">
                {/* Mobile: Card layout */}
                {isMobile ? (
                    <>
                        {/* Công nợ - nổi bật */}
                        <Card size="small" className="bg-gradient-to-r from-blue-50 to-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-gray-500 text-sm">Công nợ hiện tại</div>
                                    <div className={`text-2xl font-bold ${supplier.debtAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(supplier.debtAmount)}
                                    </div>
                                </div>
                                <Tag color={supplier.isActive ? 'success' : 'error'} className="text-sm">
                                    {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                                </Tag>
                            </div>
                        </Card>

                        {/* Thông tin liên hệ */}
                        <Card size="small">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Mã NCC</span>
                                    <span className="font-mono font-medium">{supplier.supplierCode}</span>
                                </div>
                                {supplier.groupName && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Nhóm</span>
                                        <Tag color="blue">{supplier.groupName}</Tag>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                        <PhoneOutlined className="text-blue-600" />
                                        <span>{supplier.phone}</span>
                                    </a>
                                )}
                                {supplier.email && (
                                    <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                        <MailOutlined className="text-blue-600" />
                                        <span className="truncate">{supplier.email}</span>
                                    </a>
                                )}
                                {supplier.address && (
                                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                        <EnvironmentOutlined className="text-blue-600 mt-0.5" />
                                        <span className="text-sm">{supplier.address}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </>
                ) : (
                    /* Desktop: Grid layout */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2">
                            <Descriptions title="Thông tin chung" bordered column={2}>
                                <Descriptions.Item label="Mã NCC">{supplier.supplierCode}</Descriptions.Item>
                                <Descriptions.Item label="Nhóm NCC">
                                    {supplier.groupName ? <Tag color="blue">{supplier.groupName}</Tag> : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Điện thoại">{supplier.phone || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Email">{supplier.email || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Địa chỉ" span={2}>{supplier.address || '-'}</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    <Tag color={supplier.isActive ? 'success' : 'error'}>
                                        {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                        <Card>
                            <Statistic
                                title="Tổng công nợ hiện tại"
                                value={supplier.debtAmount}
                                precision={0}
                                valueStyle={{ color: supplier.debtAmount > 0 ? '#cf1322' : '#3f8600' }}
                                formatter={(value) => formatCurrency(Number(value))}
                            />
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Card size={isMobile ? "small" : "default"} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        size={isMobile ? "small" : "middle"}
                        items={[
                            {
                                key: 'orders',
                                label: (
                                    <span className="flex items-center gap-1">
                                        <FileTextOutlined />
                                        <span>Đơn hàng</span>
                                        <Tag className="ml-1">{orders.length}</Tag>
                                    </span>
                                ),
                                children: (
                                    <CommonTable
                                        columns={orderColumns}
                                        dataSource={orders}
                                        loading={false}
                                        paging={false}
                                        mobileColumns={['poCode', 'totalAmount', 'status']}
                                        onRowClick={(record: any) => router.push(`/purchasing/orders/${record.id}`)}
                                    />
                                )
                            },
                            {
                                key: 'items',
                                label: (
                                    <span className="flex items-center gap-1">
                                        <HistoryOutlined />
                                        <span>Sản phẩm</span>
                                        <Tag className="ml-1">{items.length}</Tag>
                                    </span>
                                ),
                                children: (
                                    <CommonTable
                                        columns={itemColumns}
                                        dataSource={items}
                                        loading={false}
                                        paging={false}
                                        mobileColumns={['itemName', 'lastPrice', 'totalQuantity']}
                                    />
                                )
                            }
                        ]}
                    />
                </Card>
            </div>
        </WrapperContent>
    );
}
