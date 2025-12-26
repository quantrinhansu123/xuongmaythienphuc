'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface ImportTabProps {
  warehouseId: number;
  warehouseName: string;
  warehouseType: 'NVL' | 'THANH_PHAM';
}

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
}

interface Product {
  id: number;
  productCode: string;
  productName: string;
  unit: string;
}

interface ImportItem {
  materialId?: number;
  productId?: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes: string;
}

export default function ImportTab({ warehouseId, warehouseName, warehouseType }: ImportTabProps) {
  const { can } = usePermissions();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, [warehouseId, warehouseType]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load transactions
      const transRes = await fetch(`/api/inventory/import?warehouseId=${warehouseId}`);
      const transData = await transRes.json();
      if (transData.success) setTransactions(transData.data);

      // Load materials or products
      if (warehouseType === 'NVL') {
        const matRes = await fetch('/api/products/materials');
        const matData = await matRes.json();
        if (matData.success) setMaterials(matData.data || []);
      } else {
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        if (prodData.success) setProducts(prodData.data?.products || []);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 0, unit: '', unitPrice: 0, notes: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'select') {
      if (warehouseType === 'NVL') {
        const mat = materials.find(m => m.id === parseInt(value));
        if (mat) {
          newItems[index] = { ...newItems[index], materialId: mat.id, name: mat.materialName, unit: mat.unit };
        }
      } else {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod) {
          newItems[index] = { ...newItems[index], productId: prod.id, name: prod.productName, unit: prod.unit };
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0 || items.some(i => (!i.materialId && !i.productId) || i.quantity <= 0)) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toWarehouseId: warehouseId,
          notes,
          items: items.map(i => ({
            materialId: i.materialId,
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Nhập kho thành công!');
        setShowForm(false);
        setItems([]);
        setNotes('');
        loadData();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/inventory/import/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDetail(data.data);
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const approveTransaction = async (id: number) => {
    if (!confirm('Xác nhận duyệt phiếu nhập kho này?')) return;

    try {
      const res = await fetch(`/api/inventory/import/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Duyệt phiếu thành công!');
        setShowDetail(false);
        loadData();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const rejectTransaction = async (id: number) => {
    if (!confirm('Xác nhận HỦY phiếu nhập kho này?')) return;

    try {
      const res = await fetch(`/api/inventory/import/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Đã hủy phiếu!');
        setShowDetail(false);
        loadData();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const printPDF = (id: number) => {
    window.open(`/api/inventory/import/${id}/pdf`, '_blank');
  };

  if (loading) return <div className="text-center py-8">Đang tải...</div>;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.transactionCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.createdBy?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex gap-4">
      <div className={`space-y-4 transition-all duration-300 ${showDetail ? 'w-1/2' : 'w-full'}`}>
        <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📥 Phiếu nhập kho</h3>
        {can('inventory.import', 'create') && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Tạo phiếu nhập
          </button>
        )}
      </div>

      {/* Tìm kiếm và lọc */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="🔍 Tìm theo mã phiếu, người tạo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danh sách phiếu */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-2">📥</div>
          <div>Chưa có phiếu nhập kho</div>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Mã phiếu</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Người tạo</th>
              <th className="px-3 py-2 text-left">Ngày tạo</th>
              <th className="px-3 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTransactions.map((t, idx) => (
              <tr key={`import-${t.id}-${idx}`} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewDetail(t.id)}>
                <td className="px-3 py-2 font-mono">{t.transactionCode}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2">{t.createdBy}</td>
                <td className="px-3 py-2">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="px-3 py-2 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                  {t.status === 'PENDING' && can('inventory.import', 'edit') && (
                    <button
                      onClick={() => approveTransaction(t.id)}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      ✓ Duyệt
                    </button>
                  )}
                  <button
                    onClick={() => printPDF(t.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    In PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Tạo phiếu nhập kho</h3>
              <button onClick={() => setShowForm(false)} className="text-2xl">×</button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
              <div><strong>Kho:</strong> {warehouseName}</div>
              <div><strong>Loại:</strong> {warehouseType === 'NVL' ? 'Nguyên vật liệu' : 'Thành phẩm'}</div>
              <div><strong>Có:</strong> {warehouseType === 'NVL' ? materials.length : products.length} mặt hàng</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Danh sách hàng hóa</label>
                <button onClick={addItem} className="px-3 py-1 bg-green-600 text-white text-sm rounded">
                  ➕ Thêm
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                  Chưa có mặt hàng
                </div>
              ) : (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2">STT</th>
                      <th className="px-2 py-2">Mặt hàng</th>
                      <th className="px-2 py-2">SL</th>
                      <th className="px-2 py-2">Đơn giá</th>
                      <th className="px-2 py-2">Thành tiền</th>
                      <th className="px-2 py-2">Ghi chú</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <select
                            onChange={(e) => updateItem(idx, 'select', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">-- Chọn --</option>
                            {warehouseType === 'NVL'
                              ? materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)
                              : products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)
                            }
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border rounded"
                            min="0"
                            step="1"
                          />
                          <span className="ml-1 text-xs">{item.unit}</span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border rounded"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeItem(idx)} className="text-red-600">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {items.length > 0 && (
                <div className="mt-2 text-right">
                  <span className="text-lg font-bold text-blue-600">
                    Tổng: {items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString()} đ
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || items.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Tạo phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Detail Sidebar */}
      {showDetail && selectedDetail && (
        <div className="w-1/2 bg-white border-l shadow-xl overflow-y-auto sticky top-0 h-screen">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h3 className="text-xl font-bold">Chi tiết phiếu nhập</h3>
            <button onClick={() => setShowDetail(false)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
          </div>

          <div className="p-6 space-y-6">
              {/* Thông tin phiếu */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Mã phiếu:</span> <span className="font-mono font-medium">{selectedDetail.transactionCode}</span></div>
                  <div><span className="text-gray-600">Trạng thái:</span> <span className={`px-2 py-1 rounded text-xs ${
                    selectedDetail.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    selectedDetail.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>{selectedDetail.status}</span></div>
                  <div><span className="text-gray-600">Kho nhập:</span> {selectedDetail.toWarehouseName}</div>
                  <div><span className="text-gray-600">Người tạo:</span> {selectedDetail.createdBy}</div>
                  <div><span className="text-gray-600">Ngày tạo:</span> {new Date(selectedDetail.createdAt).toLocaleString('vi-VN')}</div>
                  {selectedDetail.approvedBy && (
                    <div><span className="text-gray-600">Người duyệt:</span> {selectedDetail.approvedBy}</div>
                  )}
                </div>
                {selectedDetail.notes && (
                  <div className="mt-3 text-sm"><span className="text-gray-600">Ghi chú:</span> {selectedDetail.notes}</div>
                )}
              </div>

              {/* Chi tiết hàng hóa */}
              <div>
                <h4 className="font-semibold mb-3">Danh sách hàng hóa</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">STT</th>
                      <th className="px-3 py-2 text-left">Mã</th>
                      <th className="px-3 py-2 text-left">Tên</th>
                      <th className="px-3 py-2 text-right">SL</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedDetail.details?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono">{item.itemCode}</td>
                        <td className="px-3 py-2">{item.itemName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-right">{item.unitPrice?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold">{item.totalAmount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-right">
                  <span className="text-lg font-bold text-blue-600">
                    Tổng: {selectedDetail.details?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0).toLocaleString()} đ
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  onClick={() => printPDF(selectedDetail.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  In PDF
                </button>
                {selectedDetail.status === 'PENDING' && can('inventory.import', 'edit') && (
                  <>
                    <button
                      onClick={() => rejectTransaction(selectedDetail.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      ✗ Hủy phiếu
                    </button>
                    <button
                      onClick={() => approveTransaction(selectedDetail.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ✓ Duyệt phiếu
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
