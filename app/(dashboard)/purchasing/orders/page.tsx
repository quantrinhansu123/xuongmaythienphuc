'use client';

import CommonTable from '@/components/CommonTable';
import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatQuantity } from '@/utils/format';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { DatePicker, Select, TableColumnsType, Tag } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;

// ... imports

interface PurchaseOrder {
  id: number;
  poCode: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  createdBy: string;
}

import { useRef } from 'react';
import * as XLSX from 'xlsx';

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
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({
    fromDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    toDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  // Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    bankAccountId: '',
    notes: ''
  });
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pagination, setPagination] = useState({ current: 1, limit: 20 });

  useEffect(() => {
    if (!permLoading && can('purchasing.orders', 'view')) {
      fetchOrders();
      fetchSuppliers();
      fetchMaterials();
      fetchItems();
      fetchWarehouses();
      fetchPaymentAccounts();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterQueries.fromDate) params.append('fromDate', filterQueries.fromDate);
      if (filterQueries.toDate) params.append('toDate', filterQueries.toDate);

      const res = await fetch(`/api/purchasing/orders?${params.toString()}`);
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
        fetchPaymentHistory(id); // Fetch history
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
      // isCustom removed
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems];

    if (field === 'itemId') {
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

  const fetchPaymentHistory = async (orderId: number) => {
    try {
      const res = await fetch(`/api/finance/cashbooks?referenceType=PURCHASE_ORDER&referenceId=${orderId}`);
      const data = await res.json();
      if (data.success) {
        setPaymentHistory(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPaymentAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts?isActive=true');
      const data = await res.json();
      if (data.success) {
        setPaymentAccounts(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (paymentForm.amount <= 0) {
      alert('Số tiền thanh toán phải lớn hơn 0');
      return;
    }

    try {
      const res = await fetch(`/api/purchasing/orders/${selectedOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          bankAccountId: paymentForm.bankAccountId,
          notes: paymentForm.notes
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Thanh toán thành công');
        setShowPaymentModal(false);
        viewDetail(selectedOrder.id); // Refresh detail
        fetchOrders(); // Refresh list
        fetchPaymentHistory(selectedOrder.id);
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredOrders.map(o => ({
      'Mã đơn': o.poCode,
      'Nhà cung cấp': o.supplierName,
      'Ngày đặt': new Date(o.orderDate).toLocaleDateString('vi-VN'),
      'Ngày dự kiến': o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('vi-VN') : '',
      'Tổng tiền': o.totalAmount,
      'Đã thanh toán': o.paidAmount,
      'Còn nợ': o.totalAmount - (o.paidAmount || 0),
      'Trạng thái': o.status,
      'Người tạo': o.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DonDatHang");
    XLSX.writeFile(wb, `DonDatHang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportExcel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('File Excel không có dữ liệu');
          return;
        }

        const requiredCols = ['Nhà cung cấp', 'Ngày đặt', 'Mã hàng', 'Số lượng', 'Đơn giá'];
        const firstRow = data[0];
        const missingCols = requiredCols.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
          alert(`File thiếu các cột bắt buộc: ${missingCols.join(', ')}`);
          return;
        }

        const groupedOrders: Record<string, any> = {};

        data.forEach((row, index) => {
          const groupKey = row['Mã đơn'] ? row['Mã đơn'] : `${row['Nhà cung cấp']}_${row['Ngày đặt']}`;

          if (!groupedOrders[groupKey]) {
            groupedOrders[groupKey] = {
              supplierName: row['Nhà cung cấp'],
              orderDate: row['Ngày đặt'],
              expectedDate: row['Ngày dự kiến'],
              notes: row['Ghi chú'],
              items: []
            };
          }
          groupedOrders[groupKey].items.push(row);
        });

        let successCount = 0;
        let failCount = 0;

        for (const key in groupedOrders) {
          const orderData = groupedOrders[key];

          const supplier = suppliers.find(s => s.supplierName.toLowerCase() === orderData.supplierName.toString().toLowerCase());
          if (!supplier) {
            console.error(`Không tìm thấy nhà cung cấp: ${orderData.supplierName}`);
            failCount++;
            continue;
          }

          const mappedItems = orderData.items.map((row: any) => {
            const itemCode = row['Mã hàng'];
            const foundItem = items.find(i => i.itemCode === itemCode);
            return {
              itemId: foundItem?.id || null,
              itemCode: itemCode,
              itemName: row['Tên hàng'] || foundItem?.itemName || 'Unknown',
              quantity: parseFloat(row['Số lượng'] || '0'),
              unitPrice: parseFloat(row['Đơn giá'] || '0'),
              unit: row['ĐVT'] || foundItem?.unit || '',
              notes: row['Ghi chú dòng']
            };
          }).filter((i: any) => i.quantity > 0 && i.itemId);

          if (mappedItems.length === 0) {
            console.error(`Order ${key}: Không có mặt hàng hợp lệ`);
            failCount++;
            continue;
          }

          const defaultWarehouse = warehouses.find(w => w.warehouseType === 'NVL') || warehouses[0];
          if (!defaultWarehouse) {
            alert('Không tìm thấy kho mặc định để nhập hàng');
            return;
          }

          const response = await fetch('/api/purchasing/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supplierId: supplier.id,
              warehouseId: defaultWarehouse.id,
              orderDate: parseExcelDate(orderData.orderDate),
              expectedDate: orderData.expectedDate ? parseExcelDate(orderData.expectedDate) : null,
              notes: orderData.notes || 'Imported via Excel',
              items: mappedItems
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        }

        alert(`Đã nhập xong! Thành công: ${successCount}. Thất bại: ${failCount} (xem console)`);
        fetchOrders();
      } catch (error) {
        console.error('Import error:', error);
        alert('Lỗi xử lý file Excel');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const parseExcelDate = (dateVal: any): string => {
    if (!dateVal) return new Date().toISOString().split('T')[0];
    if (typeof dateVal === 'number') {
      const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    const date = new Date(dateVal);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
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

  // Trigger fetch when date range changes
  useEffect(() => {
    if (!permLoading && can('purchasing.orders', 'view')) {
      fetchOrders();
    }
  }, [filterQueries.fromDate, filterQueries.toDate]);

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      'PENDING': { color: 'yellow', text: 'Chờ xác nhận' },
      'CONFIRMED': { color: 'blue', text: 'Đã xác nhận' },
      'DELIVERED': { color: 'green', text: 'Đã giao hàng' },
      'CANCELLED': { color: 'red', text: 'Đã hủy' },
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: TableColumnsType<PurchaseOrder> = [
    {
      title: 'Mã đơn',
      dataIndex: 'poCode',
      key: 'poCode',
      width: 130,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 200,
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      align: 'right' as const,
      render: (amount: number) => <span className="font-semibold">{formatCurrency(amount)}</span>,
    },
    {
      title: 'Đã TT',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 140,
      align: 'right' as const,
      render: (amount: number) => <span className="text-green-600">{formatCurrency(amount || 0)}</span>,
    },
    {
      title: 'Còn nợ',
      key: 'remainingAmount',
      width: 140,
      align: 'right' as const,
      render: (_, record) => (
        <span className="text-red-600">
          {formatCurrency(record.totalAmount - (record.paidAmount || 0))}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => getStatusTag(status),
    },
  ];

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
              <RangePicker
                value={[
                  filterQueries.fromDate ? dayjs(filterQueries.fromDate) : null,
                  filterQueries.toDate ? dayjs(filterQueries.toDate) : null,
                ]}
                onChange={(dates) => {
                  if (dates) {
                    setFilterQueries({
                      ...filterQueries,
                      fromDate: dates[0]?.format('YYYY-MM-DD'),
                      toDate: dates[1]?.format('YYYY-MM-DD'),
                    });
                  } else {
                    const { fromDate, toDate, ...rest } = filterQueries;
                    setFilterQueries(rest);
                  }
                }}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                presets={[
                  { label: 'Hôm nay', value: [dayjs(), dayjs()] },
                  { label: 'Hôm qua', value: [dayjs().add(-1, 'd'), dayjs().add(-1, 'd')] },
                  { label: '7 ngày qua', value: [dayjs().add(-7, 'd'), dayjs()] },
                  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                  { label: 'Tháng trước', value: [dayjs().add(-1, 'month').startOf('month'), dayjs().add(-1, 'month').endOf('month')] },
                ]}
              />
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
                style={{ width: 200 }}
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
          <div className="w-full">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow text-center py-12 text-gray-500">
                <div className="text-6xl mb-2">📦</div>
                <div>Chưa có đơn đặt hàng</div>
              </div>
            ) : (
              <CommonTable
                columns={columns}
                dataSource={filteredOrders}
                loading={loading}
                onRowClick={(record: PurchaseOrder) => viewDetail(record.id)}
                paging={true}
                pagination={{
                  current: pagination.current,
                  limit: pagination.limit,
                  onChange: (page, pageSize) => {
                    setPagination({ current: page, limit: pageSize || 20 });
                  },
                }}
                total={filteredOrders.length}
              />
            )}
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
                      }`}>
                      {selectedOrder.status === 'PENDING' ? 'Chờ xác nhận' :
                        selectedOrder.status === 'CONFIRMED' ? 'Đã xác nhận' :
                          selectedOrder.status === 'DELIVERED' ? 'Đã giao hàng' :
                            selectedOrder.status === 'CANCELLED' ? 'Đã hủy' : selectedOrder.status}
                    </span></div>
                    <div><span className="text-gray-600">Nhà cung cấp:</span> {selectedOrder.supplierName}</div>
                    <div><span className="text-gray-600">Ngày đặt:</span> {new Date(selectedOrder.orderDate).toLocaleDateString('vi-VN')}</div>
                    {selectedOrder.expectedDate && (
                      <div><span className="text-gray-600">Ngày dự kiến:</span> {new Date(selectedOrder.expectedDate).toLocaleDateString('vi-VN')}</div>
                    )}
                    <div><span className="text-gray-600">Người tạo:</span> {selectedOrder.createdBy}</div>
                  </div>

                  {/* Payment Info in Detail */}
                  <div className="mt-4 border-t pt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500">Tổng tiền</div>
                      <div className="font-bold text-blue-600">{formatCurrency(selectedOrder.totalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Đã thanh toán</div>
                      <div className="font-bold text-green-600">{formatCurrency(selectedOrder.paidAmount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Còn nợ</div>
                      <div className="font-bold text-red-600">{formatCurrency(selectedOrder.totalAmount - (selectedOrder.paidAmount || 0))}</div>
                    </div>
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
                          <td className="px-3 py-2 text-right">{formatQuantity(item.quantity)} {item.unit}</td>
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

                {/* Payment History Section with Translation - HIDDEN AS REQUESTED */}
                {/* {paymentHistory.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Lịch sử thanh toán</h4>
                    <div className="bg-gray-50 rounded p-4 space-y-3">
                      {paymentHistory.map((ph, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                          <div>
                            <div className="font-medium">
                              {new Date(ph.transactionDate).toLocaleDateString('vi-VN')} - {ph.transactionCode}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {ph.categoryName || ph.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatCurrency(ph.amount)}</div>
                            <div className="text-xs text-gray-500">{ph.paymentMethod === 'BANK' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Button Section */}
                <div className="flex gap-2 justify-end border-t pt-4">
                  <button
                    onClick={() => window.open(`/api/purchasing/orders/${selectedOrder.id}/pdf`, '_blank', 'noopener,noreferrer')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    🖨️ In PDF
                  </button>

                  {/* Payment Button */}
                  {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'DELIVERED') &&
                    selectedOrder.paymentStatus !== 'PAID' && can('finance.cashbooks', 'create') && (
                      <button
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            amount: selectedOrder.totalAmount - (selectedOrder.paidAmount || 0),
                            paymentMethod: 'CASH' // Default, will change based on account
                          });
                          setShowPaymentModal(true);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        💳 Thanh toán
                      </button>
                    )}

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
                                    disabled={true} // Strict selection
                                  >
                                    <option value="list">📋 Danh sách</option>
                                    {/* <option value="custom">✏️ Tự nhập</option> */}
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

          {/* Payment Modal Refined */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-bold mb-4">Thanh toán đơn hàng</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  // Determine payment method from account type
                  const selectedAcc = paymentAccounts.find(a => a.id.toString() === paymentForm.bankAccountId);
                  const method = selectedAcc?.accountType === 'BANK' ? 'BANK' : 'CASH';

                  // Update form state with correct method before submitting
                  // We do this via a temporary object because setState is async
                  const finalForm = {
                    ...paymentForm,
                    paymentMethod: method
                  };

                  // Logic copied from handleCreatePayment but using finalForm
                  if (!selectedOrder) return;
                  if (finalForm.amount <= 0) {
                    alert('Số tiền thanh toán phải lớn hơn 0');
                    return;
                  }

                  try {
                    const res = await fetch(`/api/purchasing/orders/${selectedOrder.id}/payment`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        paymentAmount: finalForm.amount,
                        paymentMethod: finalForm.paymentMethod,
                        bankAccountId: finalForm.bankAccountId,
                        notes: finalForm.notes
                      }),
                    });

                    const data = await res.json();
                    if (data.success) {
                      alert('Thanh toán thành công');
                      setShowPaymentModal(false);
                      viewDetail(selectedOrder.id);
                      fetchOrders();
                      fetchPaymentHistory(selectedOrder.id);
                    } else {
                      alert(data.error || 'Có lỗi xảy ra');
                    }
                  } catch (error) {
                    alert('Có lỗi xảy ra');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Số tiền thanh toán</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                        max={selectedOrder ? selectedOrder.totalAmount - (selectedOrder.paidAmount || 0) : 0}
                        className="w-full border rounded px-3 py-2"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentForm({
                          ...paymentForm,
                          amount: selectedOrder ? selectedOrder.totalAmount - (selectedOrder.paidAmount || 0) : 0
                        })}
                        className="whitespace-nowrap px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Trả hết
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Còn nợ: {selectedOrder ? formatCurrency(selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)) : 0}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Nguồn tiền / Tài khoản</label>
                    <select
                      value={paymentForm.bankAccountId}
                      onChange={e => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">-- Chọn tài khoản --</option>
                      {paymentAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.accountName || a.bankName}
                          {a.accountNumber ? ` - ${a.accountNumber}` : ''}
                          ({a.accountType === 'BANK' ? 'Ngân hàng' : 'Tiền mặt'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Ghi chú</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Xác nhận thanh toán
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Hidden File Input for Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={processImportExcel}
            className="hidden"
            accept=".xlsx, .xls"
          />
        </div>
      </WrapperContent >
    </>
  );
}
