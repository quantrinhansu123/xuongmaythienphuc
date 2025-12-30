'use client';

import CommonTable from '@/components/CommonTable';
import TableActions from '@/components/TableActions';
import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Select, TableColumnsType, Tag } from 'antd';
import { useRouter } from 'next/navigation';
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

export default function SuppliersPage() {
  const router = useRouter();
  const { can, loading: permLoading } = usePermissions();
  const { message } = App.useApp();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    supplierCode: '',
    supplierName: '',
    phone: '',
    email: '',
    address: '',
    supplierGroupId: '',
  });
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);

  useEffect(() => {
    if (!permLoading && can('purchasing.suppliers', 'view')) {
      fetchSuppliers();
      fetchGroups();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/purchasing/suppliers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSuppliers(data.data);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error(error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    router.push(`/purchasing/suppliers/${supplier.id}`);
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setFormData({
      supplierCode: '',
      supplierName: '',
      phone: '',
      email: '',
      address: '',
      supplierGroupId: '',
    });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setSelectedSupplier(supplier);
    setFormData({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      supplierGroupId: groups.find(g => g.groupName === supplier.groupName)?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedSupplier
        ? `/api/purchasing/suppliers/${selectedSupplier.id}`
        : '/api/purchasing/suppliers';

      const res = await fetch(url, {
        method: selectedSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(selectedSupplier ? 'Cập nhật thành công' : 'Tạo nhà cung cấp thành công');
        setShowModal(false);
        fetchSuppliers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm('Xác nhận xóa nhà cung cấp này?')) return;
    try {
      const res = await fetch(`/api/purchasing/suppliers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công');
        fetchSuppliers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
  };

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel đang được phát triển');
  };

  const handleImportExcel = () => {
    alert('Chức năng nhập Excel đang được phát triển');
  };

  const filteredSuppliers = suppliers.filter(s => {
    const searchKey = 'search,supplierName,supplierCode,phone';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue ||
      s.supplierName.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.supplierCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.phone?.includes(searchValue);

    const statusValue = filterQueries['isActive'];
    const matchStatus = statusValue === undefined || s.isActive === (statusValue === 'true');

    const groupValue = filterQueries['groupId'];
    const matchGroup = !groupValue || s.groupName === groups.find(g => g.id.toString() === groupValue)?.groupName;

    return matchSearch && matchStatus && matchGroup;
  });

  const handleBulkDelete = async (ids: React.Key[]) => {
    try {
      for (const id of ids) {
        const res = await fetch(`/api/purchasing/suppliers/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      message.success(`Đã xóa ${ids.length} nhà cung cấp`);
      fetchSuppliers();
    } catch (error: any) {
      message.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const columns: TableColumnsType<Supplier> = [
    {
      title: 'Mã NCC',
      dataIndex: 'supplierCode',
      key: 'supplierCode',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: 'Tên nhà cung cấp',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string) => phone || '-',
    },
    {
      title: 'Nhóm',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 150,
      render: (name: string) => name ? <Tag color="blue">{name}</Tag> : <span className="text-gray-400">-</span>,
    },
    {
      title: 'Công nợ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      width: 130,
      align: 'right' as const,
      render: (amount: number) => (
        <span className={amount > 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_, record) => (
        <TableActions
          onEdit={(e) => e && handleEdit(record, e)}
          onDelete={(e) => e && handleDelete(record.id, e)}
          canEdit={can('purchasing.suppliers', 'edit')}
          canDelete={can('purchasing.suppliers', 'delete')}
        />
      ),
    },
  ];

  return (
    <>
      <WrapperContent<Supplier>
        title="Quản lý nhà cung cấp"
        isNotAccessible={!can('purchasing.suppliers', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('purchasing.suppliers', 'create')
            ? [
              {
                type: 'default',
                name: 'Đặt lại',
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
              {
                type: 'primary',
                name: 'Thêm NCC',
                onClick: handleCreate,
                icon: <PlusOutlined />,
              },
              {
                type: 'default',
                name: 'Xuất Excel',
                onClick: handleExportExcel,
                icon: <DownloadOutlined />,
              },
              {
                type: 'default',
                name: 'Nhập Excel',
                onClick: handleImportExcel,
                icon: <UploadOutlined />,
              },
            ]
            : [],
          searchInput: {
            placeholder: 'Tìm theo tên, mã, số điện thoại...',
            filterKeys: ['supplierName', 'supplierCode', 'phone'],
            suggestions: {
              apiEndpoint: '/api/purchasing/suppliers',
              labelKey: 'supplierName',
              valueKey: 'supplierCode',
              descriptionKey: 'phone',
            },
          },
          customToolbar: (
            <div className="flex gap-2 items-center">
              <Select
                style={{ width: 130 }}
                placeholder="Trạng thái"
                allowClear
                size="middle"
                value={filterQueries['isActive']}
                onChange={(value) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, isActive: value });
                  } else {
                    const { isActive, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Hoạt động', value: 'true' },
                  { label: 'Ngừng', value: 'false' },
                ]}
              />
              <Select
                style={{ width: 150 }}
                placeholder="Nhóm NCC"
                allowClear
                size="middle"
                value={filterQueries['groupId']}
                onChange={(value) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, groupId: value });
                  } else {
                    const { groupId, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={groups.map(g => ({ label: g.groupName, value: g.id.toString() }))}
              />
            </div>
          ),
          filters: {
            query: filterQueries,
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                if (value) {
                  newQueries[key] = value;
                } else {
                  delete newQueries[key];
                }
              });
              setFilterQueries(newQueries);
            },
            onReset: () => setFilterQueries({}),
          },
        }}
      >
        <CommonTable
          columns={columns}
          dataSource={filteredSuppliers}
          loading={loading}
          onRowClick={handleViewDetail}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds,
          }}
          onBulkDelete={handleBulkDelete}
          bulkDeleteConfig={{
            confirmTitle: 'Xác nhận xóa nhà cung cấp',
            confirmMessage: 'Bạn có chắc muốn xóa {count} nhà cung cấp đã chọn?'
          }}
        />
      </WrapperContent>

      {/* Modal Supplier */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã NCC *</label>
                <input
                  type="text"
                  value={formData.supplierCode}
                  onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  disabled={!!selectedSupplier}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhà cung cấp *</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nhóm NCC</label>
                <select
                  value={formData.supplierGroupId}
                  onChange={(e) => setFormData({ ...formData, supplierGroupId: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
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
                  {selectedSupplier ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
