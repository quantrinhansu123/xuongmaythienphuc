'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useState } from 'react';

interface PurchaseOrder {
  id: number;
  poCode: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: number;
  status: string;
  createdBy: string;
}

export default function PurchaseOrdersPage() {
  const { can, loading: permLoading } = usePermissions();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    warehouseId: '', // Kho nhập hàng
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!permLoading && can('purchasing.orders', 'view')) {
      fetchOrders();
      fetchSuppliers();
      fetchMaterials();
      fetchItems();
      fetchWarehouses();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/purchasing/orders');
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/purchasing/suppliers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/products/materials');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMaterials(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchItems = async () => {
    try {
      // Chỉ lấy NVL (MATERIAL) để có giá
      const res = await fetch('/api/products/items');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Lọc chỉ lấy NVL
        setItems(data.data.filter((i: any) => i.itemType === 'MATERIAL'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      // Lấy kho NVL và Hỗn hợp để nhập hàng
      const res = await fetch('/api/inventory/warehouses');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Lọc kho NVL và Hỗn hợp
        setWarehouses(data.data.filter((w: any) => w.warehouseType === 'NVL' || w.warehouseType === 'HON_HOP'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/purchasing/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
        setShowDetail(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateOrder = () => {
    setOrderForm({
      supplierId: '',
      warehouseId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: '',
      notes: '',
    });
    setOrderItems([]);
    setShowCreateModal(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      itemId: '',
      materialId: '',
      itemCode: '',
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      unit: '',
      totalAmount: 0,
      notes: '',
      isCustom: false, // false = chọn từ danh sách, true = nhập tự do
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];

    if (field === 'isCustom') {
      // Chuyển đổi giữa chọn từ danh sách và nhập tự do
      newItems[index].isCustom = value;
      if (!value) {
        // Reset về chọn từ danh sách
        newItems[index].materialId = '';
        newItems[index].itemId = '';
        newItems[index].itemCode = '';
        newItems[index].itemName = '';
        newItems[index].unit = '';
        newItems[index].unitPrice = 0;
        newItems[index].totalAmount = 0;
      } else {
        // Reset về nhập tự do
        newItems[index].materialId = '';
        newItems[index].itemId = '';
      }
    } else if (field === 'itemId') {
      // Chọn từ danh sách items (có giá)
      const item = Array.isArray(items) ? items.find(i => i.id === parseInt(value)) : null;
      if (item) {
        newItems[index] = {
          ...newItems[index],
          itemId: item.id,
          materialId: item.materialId || null,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          unitPrice: item.costPrice || 0,
          totalAmount: newItems[index].quantity * (item.costPrice || 0),
        };
      }
    } else if (field === 'materialId') {
      // Fallback: chọn từ materials (không có giá)
      const material = Array.isArray(materials) ? materials.find(m => m.id === parseInt(value)) : null;
      if (material) {
        // Tìm item tương ứng để lấy giá
        const relatedItem = Array.isArray(items) ? items.find(i => i.materialId === material.id) : null;
        newItems[index] = {
          ...newItems[index],
          materialId: material.id,
          itemCode: material.materialCode,
          itemName: material.materialName,
          unit: material.unit,
          unitPrice: relatedItem?.costPrice || 0,
          totalAmount: newItems[index].quantity * (relatedItem?.costPrice || 0),
        };
      }
    } else if (field === 'quantity') {
      const qty = parseFloat(value) || 0;
      newItems[index].quantity = qty;
      newItems[index].totalAmount = qty * newItems[index].unitPrice;
    } else if (field === 'unitPrice') {
      const price = parseFloat(value) || 0;
      newItems[index].unitPrice = price;
      newItems[index].totalAmount = newItems[index].quantity * price;
    } else {
      newItems[index][field] = value;
    }

    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderForm.supplierId) {
      alert('Vui lòng chọn nhà cung cấp');
      return;
    }

    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất 1 nguyên liệu');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: parseInt(orderForm.supplierId),
          warehouseId: orderForm.warehouseId ? parseInt(orderForm.warehouseId) : null,
          orderDate: orderForm.orderDate,
          expectedDate: orderForm.expectedDate || null,
          notes: orderForm.notes,
          items: orderItems.map(item => ({
            itemId: item.itemId || null,
            materialId: item.materialId || null,
            itemCode: item.itemCode,
            itemName: item.itemName,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Tạo đơn đặt hàng thành công! Mã đơn: ${data.data.poCode}`);
        setShowCreateModal(false);
        fetchOrders();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    if (!confirm(`Xác nhận chuyển trạng thái sang ${status}?`)) return;

    try {
      const res = await fetch(`/api/purchasing/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công');
        fetchOrders();
        if (showDetail) viewDetail(id);
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
    setFilterStatus('ALL');
  };

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel đang được phát triển');
  };

  const handleImportExcel = () => {
    alert('Chức năng nhập Excel đang được phát triển');
  };

  const filteredOrders = orders.filter(o => {
    const searchKey = 'search,poCode,supplierName';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue ||
      o.poCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchValue.toLowerCase());

    const statusValue = filterQueries['status'];
    const matchStatus = !statusValue || o.status === statusValue;

    const supplierIdValue = filterQueries['supplierId'];
    const matchSupplier = !supplierIdValue ||
      suppliers.find(s => s.id.toString() === supplierIdValue)?.supplierName === o.supplierName;

    return matchSearch && matchStatus && matchSupplier;
  });

  return (
    <>
      <WrapperContent<PurchaseOrder>
        title="Đơn đặt hàng"
        isNotAccessible={!can('purchasing.orders', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('purchasing.orders', 'create')
            ? [
              {
                type: 'default',
                name: 'Đặt lại',
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
              {
                type: 'primary',
                name: 'Thêm',
                onClick: handleCreateOrder,
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
            : [
              {
                type: 'default',
                name: 'Đặt lại',
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
            ],
          searchInput: {
            placeholder: 'Tìm theo mã đơn, nhà cung cấp...',
            filterKeys: ['poCode', 'supplierName'],
            suggestions: {
              apiEndpoint: '/api/purchasing/orders',
              labelKey: 'poCode',
              descriptionKey: 'supplierName',
            },
          },
          customToolbar: (
            <div className="flex gap-2 items-center">
              <Select
                style={{ width: 140 }}
                placeholder="Trạng thái"
                allowClear
                size="middle"
                value={filterQueries['status']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, status: value });
                  } else {
                    const { status, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={[
                  { label: 'Chờ xác nhận', value: 'PENDING' },
                  { label: 'Đã xác nhận', value: 'CONFIRMED' },
                  { label: 'Đã giao hàng', value: 'DELIVERED' },
                  { label: 'Đã hủy', value: 'CANCELLED' },
                ]}
              />
              <Select
                style={{ width: 160 }}
                placeholder="Nhà cung cấp"
                allowClear
                size="middle"
                showSearch
                optionFilterProp="label"
                value={filterQueries['supplierId']}
                onChange={(value: string | undefined) => {
                  if (value !== undefined) {
                    setFilterQueries({ ...filterQueries, supplierId: value });
                  } else {
                    const { supplierId, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                options={suppliers.map(s => ({ label: s.supplierName, value: s.id.toString() }))}
              />
            </div>
          ),
        }}
      >
        <div className="flex gap-4">
          <div className={`space-y-4 transition-all duration-300 ${showDetail ? 'w-1/2' : 'w-full'}`}>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-2">📦</div>
                  <div>Chưa có đơn đặt hàng</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-32">Mã đơn</th>
                      <th className="px-4 py-3 text-left w-48">Nhà cung cấp</th>
                      <th className="px-4 py-3 text-left w-32">Ngày đặt</th>
                      <th className="px-4 py-3 text-right w-36">Tổng tiền</th>
                      <th className="px-4 py-3 text-left w-40">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => viewDetail(order.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono">{order.poCode}</td>
                        <td className="px-4 py-3">{order.supplierName}</td>
                        <td className="px-4 py-3">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {showDetail && selectedOrder && (
            <div className="w-1/2 bg-white border-l shadow-xl overflow-y-auto fixed right-0 top-0 h-screen z-40">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold">Chi tiết đơn đặt hàng</h3>
                <button onClick={() => setShowDetail(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-600">Mã đơn:</span> <span className="font-mono font-medium">{selectedOrder.poCode}</span></div>
                    <div><span className="text-gray-600">Trạng thái:</span> <span className={`px-2 py-1 rounded text-xs ${selectedOrder.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrder.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        selectedOrder.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                      }`}>{selectedOrder.status}</span></div>
                    <div><span className="text-gray-600">Nhà cung cấp:</span> {selectedOrder.supplierName}</div>
                    <div><span className="text-gray-600">Ngày đặt:</span> {new Date(selectedOrder.orderDate).toLocaleDateString('vi-VN')}</div>
                    {selectedOrder.expectedDate && (
                      <div><span className="text-gray-600">Ngày dự kiến:</span> {new Date(selectedOrder.expectedDate).toLocaleDateString('vi-VN')}</div>
                    )}
                    <div><span className="text-gray-600">Người tạo:</span> {selectedOrder.createdBy}</div>
                  </div>
                  {selectedOrder.notes && (
                    <div className="mt-3 text-sm"><span className="text-gray-600">Ghi chú:</span> {selectedOrder.notes}</div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Danh sách nguyên liệu</h4>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">STT</th>
                        <th className="px-3 py-2 text-left">Nguyên liệu</th>
                        <th className="px-3 py-2 text-right">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.details?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{item.materialName}</td>
                          <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-right">
                    <div className="text-lg font-bold text-blue-600">
                      Tổng tiền: {formatCurrency(selectedOrder.totalAmount)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t pt-4">
                  <button
                    onClick={() => window.open(`/api/purchasing/orders/${selectedOrder.id}/pdf`, '_blank')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    🖨️ In PDF
                  </button>
                  {selectedOrder.status === 'PENDING' && can('purchasing.orders', 'edit') && (
                    <>
                      <button
                        onClick={() => updateStatus(selectedOrder.id, 'CANCELLED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        ✗ Hủy đơn
                      </button>
                      <button
                        onClick={() => updateStatus(selectedOrder.id, 'CONFIRMED')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        ✓ Xác nhận
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && can('purchasing.orders', 'edit') && (
                    <button
                      onClick={() => updateStatus(selectedOrder.id, 'DELIVERED')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ✓ Đã giao hàng
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Order Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Tạo đơn đặt hàng mới</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nhà cung cấp *</label>
                      <select
                        value={orderForm.supplierId}
                        onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      >
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {Array.isArray(suppliers) && suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.supplierName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kho nhập hàng *</label>
                      <select
                        value={orderForm.warehouseId}
                        onChange={(e) => setOrderForm({ ...orderForm, warehouseId: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      >
                        <option value="">-- Chọn kho nhập --</option>
                        {Array.isArray(warehouses) && warehouses.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.warehouseName} ({w.warehouseType === 'NVL' ? 'Kho NVL' : 'Kho hỗn hợp'})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Khi giao hàng sẽ tự động tạo phiếu nhập kho</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày đặt *</label>
                      <input
                        type="date"
                        value={orderForm.orderDate}
                        onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày dự kiến giao</label>
                      <input
                        type="date"
                        value={orderForm.expectedDate}
                        onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú</label>
                    <textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      rows={2}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium">Danh sách nguyên liệu *</label>
                      <button
                        type="button"
                        onClick={addOrderItem}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        ➕ Thêm NVL
                      </button>
                    </div>

                    {orderItems.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                        Chưa có nguyên liệu
                      </div>
                    ) : (
                      <div className="border rounded overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2">STT</th>
                              <th className="px-2 py-2">Loại</th>
                              <th className="px-2 py-2">Mã</th>
                              <th className="px-2 py-2">Tên NVL</th>
                              <th className="px-2 py-2">ĐVT</th>
                              <th className="px-2 py-2">SL</th>
                              <th className="px-2 py-2">Đơn giá</th>
                              <th className="px-2 py-2">Thành tiền</th>
                              <th className="px-2 py-2">Ghi chú</th>
                              <th className="px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {orderItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-2 text-center">{idx + 1}</td>
                                <td className="px-2 py-2">
                                  <select
                                    value={item.isCustom ? 'custom' : 'list'}
                                    onChange={(e) => updateOrderItem(idx, 'isCustom', e.target.value === 'custom')}
                                    className="w-24 px-2 py-1 border rounded text-xs"
                                  >
                                    <option value="list">📋 Danh sách</option>
                                    <option value="custom">✏️ Tự nhập</option>
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  {item.isCustom ? (
                                    <input
                                      type="text"
                                      value={item.itemCode}
                                      onChange={(e) => updateOrderItem(idx, 'itemCode', e.target.value)}
                                      className="w-24 px-2 py-1 border rounded text-sm"
                                      placeholder="Mã..."
                                    />
                                  ) : (
                                    <span className="text-xs text-gray-500">{item.itemCode || '-'}</span>
                                  )}
                                </td>
                                <td className="px-2 py-2">
                                  {item.isCustom ? (
                                    <input
                                      type="text"
                                      value={item.itemName}
                                      onChange={(e) => updateOrderItem(idx, 'itemName', e.target.value)}
                                      className="w-full px-2 py-1 border rounded text-sm"
                                      placeholder="Tên NVL..."
                                      required
                                    />
                                  ) : (
                                    <select
                                      value={item.itemId}
                                      onChange={(e) => updateOrderItem(idx, 'itemId', e.target.value)}
                                      className="w-full px-2 py-1 border rounded text-sm"
                                      required
                                    >
                                      <option value="">-- Chọn NVL --</option>
                                      {Array.isArray(items) && items.map(i => (
                                        <option key={i.id} value={i.id}>
                                          {i.itemName} ({i.itemCode}) - {formatCurrency(i.costPrice || 0)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                                <td className="px-2 py-2">
                                  {item.isCustom ? (
                                    <input
                                      type="text"
                                      value={item.unit}
                                      onChange={(e) => updateOrderItem(idx, 'unit', e.target.value)}
                                      className="w-16 px-2 py-1 border rounded text-sm"
                                      placeholder="ĐVT"
                                      required
                                    />
                                  ) : (
                                    <span className="text-xs">{item.unit || '-'}</span>
                                  )}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                                    className="w-20 px-2 py-1 border rounded text-right"
                                    min="0"
                                    step="0.01"
                                    required
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) => updateOrderItem(idx, 'unitPrice', e.target.value)}
                                    className="w-24 px-2 py-1 border rounded text-right"
                                    min="0"
                                    required
                                  />
                                </td>
                                <td className="px-2 py-2 text-right font-semibold">
                                  {formatCurrency(item.totalAmount, "")}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => updateOrderItem(idx, 'notes', e.target.value)}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    placeholder="Ghi chú..."
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    type="button"
                                    onClick={() => removeOrderItem(idx)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium">Tổng tiền:</span>
                      <span className="font-bold text-blue-600 text-xl">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      disabled={submitting || orderItems.length === 0}
                    >
                      {submitting ? 'Đang xử lý...' : '✓ Tạo đơn đặt hàng'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </WrapperContent>
    </>
  );
}
