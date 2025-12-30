'use client';

import CommonTable from '@/components/CommonTable';
import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, TableColumnsType, Tag } from 'antd';
import { useEffect, useState } from 'react';

interface SupplierGroup {
    id: number;
    groupCode: string;
    groupName: string;
    description: string;
    supplierCount?: number;
}

interface Supplier {
    id: number;
    supplierCode: string;
    supplierName: string;
    phone: string;
}

export default function SupplierGroupsPage() {
    const { can, loading: permLoading } = usePermissions();
    const [groups, setGroups] = useState<SupplierGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<SupplierGroup | null>(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [detailGroup, setDetailGroup] = useState<SupplierGroup | null>(null);
    const [suppliersInGroup, setSuppliersInGroup] = useState<Supplier[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, limit: 20 });
    const [formData, setFormData] = useState({
        groupCode: '',
        groupName: '',
        description: '',
    });

    useEffect(() => {
        if (!permLoading && can('purchasing.suppliers', 'view')) {
            fetchGroups();
        } else if (!permLoading) {
            setLoading(false);
        }
    }, [permLoading]);

    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/purchasing/supplier-groups');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setGroups(data.data);
            } else {
                setGroups([]);
            }
        } catch (error) {
            console.error(error);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliersInGroup = async (groupId: number) => {
        setSuppliersLoading(true);
        try {
            const res = await fetch(`/api/purchasing/suppliers?groupId=${groupId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setSuppliersInGroup(data.data);
            } else {
                setSuppliersInGroup([]);
            }
        } catch (error) {
            console.error(error);
            setSuppliersInGroup([]);
        } finally {
            setSuppliersLoading(false);
        }
    };

    const handleViewDetail = (group: SupplierGroup) => {
        setDetailGroup(group);
        setShowDetailDrawer(true);
        fetchSuppliersInGroup(group.id);
    };

    const handleCreate = () => {
        setSelectedGroup(null);
        setFormData({ groupCode: '', groupName: '', description: '' });
        setShowModal(true);
    };

    const handleEdit = (group: SupplierGroup) => {
        setSelectedGroup(group);
        setFormData({
            groupCode: group.groupCode,
            groupName: group.groupName,
            description: group.description || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = selectedGroup
                ? `/api/purchasing/supplier-groups/${selectedGroup.id}`
                : '/api/purchasing/supplier-groups';

            const res = await fetch(url, {
                method: selectedGroup ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                alert(selectedGroup ? 'Cập nhật thành công' : 'Tạo nhóm thành công');
                setShowModal(false);
                fetchGroups();
            } else {
                alert(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            alert('Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xác nhận xóa nhóm này?')) return;
        try {
            const res = await fetch(`/api/purchasing/supplier-groups/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('Xóa thành công');
                fetchGroups();
            } else {
                alert(data.error || 'Có lỗi xảy ra');
            }
        } catch (error) {
            alert('Có lỗi xảy ra');
        }
    };

    const columns: TableColumnsType<SupplierGroup> = [
        {
            title: 'Mã nhóm',
            dataIndex: 'groupCode',
            key: 'groupCode',
            width: 150,
            render: (code: string) => <span className="font-mono">{code}</span>,
        },
        {
            title: 'Tên nhóm',
            dataIndex: 'groupName',
            key: 'groupName',
            width: 200,
            render: (name: string) => <span className="font-medium">{name}</span>,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 250,
            render: (desc: string) => desc || '-',
        },
        {
            title: 'Số NCC',
            dataIndex: 'supplierCount',
            key: 'supplierCount',
            width: 120,
            align: 'center' as const,
            render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
        },
    ];

    return (
        <>
            <WrapperContent<SupplierGroup>
                title="Nhóm nhà cung cấp"
                isNotAccessible={!can('purchasing.suppliers', 'view')}
                isLoading={permLoading || loading}
                header={{
                    buttonEnds: can('purchasing.suppliers', 'create')
                        ? [
                            {
                                type: 'default',
                                name: 'Đặt lại',
                                onClick: fetchGroups,
                                icon: <ReloadOutlined />,
                            },
                            {
                                type: 'primary',
                                name: 'Thêm nhóm',
                                onClick: handleCreate,
                                icon: <PlusOutlined />,
                            },
                        ]
                        : [],
                    searchInput: {
                        placeholder: 'Tìm theo tên, mã nhóm...',
                        filterKeys: ['groupName', 'groupCode'],
                    },
                }}
            >
                {groups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
                        <div className="text-6xl mb-2">📊</div>
                        <div>Chưa có nhóm nhà cung cấp</div>
                    </div>
                ) : (
                    <CommonTable
                        columns={columns}
                        dataSource={groups}
                        loading={loading}
                        onRowClick={(record: SupplierGroup) => handleViewDetail(record)}
                        paging={true}
                        pagination={{
                            current: pagination.current,
                            limit: pagination.limit,
                            onChange: (page, pageSize) => {
                                setPagination({ current: page, limit: pageSize || 20 });
                            },
                        }}
                        total={groups.length}
                    />
                )}
            </WrapperContent>

            {/* Detail Drawer */}
            <Drawer
                title="Chi tiết nhóm nhà cung cấp"
                open={showDetailDrawer}
                onClose={() => setShowDetailDrawer(false)}
                width={640}
            >
                {detailGroup && (
                    <div className="space-y-4">
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Mã nhóm">
                                <span className="font-mono">{detailGroup.groupCode}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Tên nhóm">
                                <span className="font-medium">{detailGroup.groupName}</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Mô tả">
                                {detailGroup.description || '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">Nhà cung cấp trong nhóm</h3>
                            {suppliersLoading ? (
                                <div className="text-center py-4">Đang tải...</div>
                            ) : suppliersInGroup.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 border rounded bg-gray-50">
                                    Chưa có nhà cung cấp nào trong nhóm này
                                </div>
                            ) : (
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Mã NCC</th>
                                                <th className="px-3 py-2 text-left">Tên NCC</th>
                                                <th className="px-3 py-2 text-left">SĐT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {suppliersInGroup.map(supplier => (
                                                <tr key={supplier.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-mono">{supplier.supplierCode}</td>
                                                    <td className="px-3 py-2 font-medium">{supplier.supplierName}</td>
                                                    <td className="px-3 py-2">{supplier.phone || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            {can('purchasing.suppliers', 'edit') && (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setShowDetailDrawer(false);
                                        handleEdit(detailGroup);
                                    }}
                                >
                                    Sửa
                                </Button>
                            )}
                            {can('purchasing.suppliers', 'delete') && (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                        setShowDetailDrawer(false);
                                        handleDelete(detailGroup.id);
                                    }}
                                >
                                    Xóa
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">
                            {selectedGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Mã nhóm *</label>
                                <input
                                    type="text"
                                    value={formData.groupCode}
                                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    disabled={!!selectedGroup}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tên nhóm *</label>
                                <input
                                    type="text"
                                    value={formData.groupName}
                                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Mô tả</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {selectedGroup ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
