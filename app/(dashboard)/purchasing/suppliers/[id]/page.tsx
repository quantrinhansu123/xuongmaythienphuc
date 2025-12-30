'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { ArrowLeftOutlined, EditOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Statistic, Table, Tabs, Tag } from 'antd';
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
        // Navigate to edit modal or page - for now maybe just back to list and open modal?
        // Or better, implement update here. 
        // To keep it simple, let's assume editing is done in the list page for now or added later.
        // User asked for detail page, editing can be added here if needed.
        // Let's implement editing modal later if requested, focusing on display first.
        alert('Chức năng sửa chi tiết đang được phát triển');
    };

    if (loading) return <div>Đang tải...</div>;
    if (!supplier) return <div>Không tìm thấy nhà cung cấp</div>;

    return (
        <WrapperContent
            title={`Chi tiết nhà cung cấp: ${supplier.supplierName}`}
            isNotAccessible={!can('purchasing.suppliers', 'view')}
            header={{
                buttonEnds: [
                    {
                        type: 'default',
                        name: 'Quay lại',
                        icon: <ArrowLeftOutlined />,
                        onClick: () => router.push('/purchasing/suppliers'),
                    },
                ]
            }}
        >
            <div className="space-y-6">
                {/* Header Info */}
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
                        <div className="mt-4 flex gap-2">
                            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit} block>Sửa thông tin</Button>
                        </div>
                    </Card>
                </div>

                {/* Tabs */}
                <Card>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            {
                                key: 'orders',
                                label: (
                                    <span>
                                        <FileTextOutlined />
                                        Lịch sử đơn hàng ({orders.length})
                                    </span>
                                ),
                                children: (
                                    <Table
                                        dataSource={orders}
                                        rowKey="id"
                                        columns={[
                                            {
                                                title: 'Mã đơn',
                                                dataIndex: 'poCode',
                                                key: 'poCode',
                                                render: (text) => <span className="font-mono font-medium text-blue-600">{text}</span>
                                            },
                                            {
                                                title: 'Ngày đặt',
                                                dataIndex: 'orderDate',
                                                key: 'orderDate',
                                                render: (text) => new Date(text).toLocaleDateString('vi-VN')
                                            },
                                            {
                                                title: 'Tổng tiền',
                                                dataIndex: 'totalAmount',
                                                key: 'totalAmount',
                                                align: 'right',
                                                render: (val) => <span className="font-medium">{formatCurrency(val)}</span>
                                            },
                                            {
                                                title: 'Đã thanh toán',
                                                dataIndex: 'paidAmount',
                                                key: 'paidAmount',
                                                align: 'right',
                                                render: (val) => <span className="text-green-600">{formatCurrency(val)}</span>
                                            },
                                            {
                                                title: 'Còn nợ',
                                                key: 'remaining',
                                                align: 'right',
                                                render: (_, record) => {
                                                    const remaining = record.totalAmount - (record.paidAmount || 0);
                                                    return remaining > 0 ? <span className="text-red-600 font-medium">{formatCurrency(remaining)}</span> : <span className="text-gray-400">0</span>;
                                                }
                                            },
                                            {
                                                title: 'Trạng thái',
                                                dataIndex: 'status',
                                                key: 'status',
                                                align: 'center',
                                                render: (status) => (
                                                    <Tag color={
                                                        status === 'PENDING' ? 'gold' :
                                                            status === 'CONFIRMED' ? 'blue' :
                                                                status === 'DELIVERED' ? 'green' : 'red'
                                                    }>
                                                        {status === 'PENDING' ? 'Chờ xác nhận' :
                                                            status === 'CONFIRMED' ? 'Đã xác nhận' :
                                                                status === 'DELIVERED' ? 'Đã giao hàng' :
                                                                    status === 'CANCELLED' ? 'Đã hủy' : status}
                                                    </Tag>
                                                )
                                            }
                                        ]}
                                    />
                                )
                            },
                            {
                                key: 'items',
                                label: (
                                    <span>
                                        <HistoryOutlined />
                                        Sản phẩm cung cấp ({items.length})
                                    </span>
                                ),
                                children: (
                                    <Table
                                        dataSource={items}
                                        rowKey="itemCode"
                                        columns={[
                                            {
                                                title: 'Mã SP',
                                                dataIndex: 'itemCode',
                                                key: 'itemCode',
                                                render: (text) => <span className="font-mono">{text || '-'}</span>
                                            },
                                            {
                                                title: 'Tên sản phẩm',
                                                dataIndex: 'itemName',
                                                key: 'itemName',
                                                render: (text) => <span className="font-medium">{text}</span>
                                            },
                                            {
                                                title: 'Đơn vị',
                                                dataIndex: 'unit',
                                                key: 'unit',
                                                align: 'center',
                                                render: (text) => <Tag>{text}</Tag>
                                            },
                                            {
                                                title: 'Giá nhập gần nhất',
                                                dataIndex: 'lastPrice',
                                                key: 'lastPrice',
                                                align: 'right',
                                                render: (val) => formatCurrency(val)
                                            },
                                            {
                                                title: 'Ngày nhập cuối',
                                                dataIndex: 'lastOrderDate',
                                                key: 'lastOrderDate',
                                                align: 'center',
                                                render: (text) => text ? new Date(text).toLocaleDateString('vi-VN') : '-'
                                            },
                                            {
                                                title: 'Tổng số lượng đã nhập',
                                                dataIndex: 'totalQuantity',
                                                key: 'totalQuantity',
                                                align: 'right',
                                                render: (val) => val.toLocaleString('vi-VN')
                                            }
                                        ]}
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
