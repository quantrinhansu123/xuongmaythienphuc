'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface Warehouse {
  id: number;
  warehouseCode: string;
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
  type: 'material' | 'product';
  materialId?: number;
  productId?: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes: string;
}

export default function CreateImportPage() {
  const router = useRouter();
  const { can, loading: permLoading } = usePermissions();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouseType, setWarehouseType] = useState<'NVL' | 'THANH_PHAM' | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (warehouseType === 'NVL') {
      fetchMaterials();
    } else if (warehouseType === 'THANH_PHAM') {
      fetchProducts();
    }
  }, [warehouseType]);

  const fetchWarehouses = async () => {
    const res = await fetch('/api/inventory/warehouses');
    const data = await res.json();
    if (data.success) setWarehouses(data.data);
  };

  const fetchMaterials = async () => {
    const res = await fetch('/api/products/materials');
    const data = await res.json();
    if (data.success) setMaterials(data.data);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) setProducts(data.data);
  };

  const handleWarehouseChange = (warehouseId: number) => {
    setSelectedWarehouse(warehouseId);
    const wh = warehouses.find(w => w.id === warehouseId);
    setWarehouseType(wh?.warehouseType || null);
    setItems([]); // Reset items khi đổi kho
  };

  const addItem = () => {
    setItems([...items, {
      type: warehouseType === 'NVL' ? 'material' : 'product',
      code: '',
      name: '',
      quantity: 0,
      unit: '',
      unitPrice: 0,
      notes: ''
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'select') {
      if (warehouseType === 'NVL') {
        const material = materials.find(m => m.id === parseInt(value));
        if (material) {
          newItems[index] = {
            ...newItems[index],
            materialId: material.id,
            code: material.materialCode,
            name: material.materialName,
            unit: material.unit
          };
        }
      } else {
        const product = products.find(p => p.id === parseInt(value));
        if (product) {
          newItems[index] = {
            ...newItems[index],
            productId: product.id,
            code: product.productCode,
            name: product.productName,
            unit: product.unit
          };
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse || items.length === 0) {
      alert('Vui lòng chọn kho và thêm ít nhất 1 mặt hàng');
      return;
    }

    const invalidItems = items.filter(item => 
      (!item.materialId && !item.productId) || item.quantity <= 0
    );
    if (invalidItems.length > 0) {
      alert('Vui lòng điền đầy đủ thông tin và số lượng > 0');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toWarehouseId: selectedWarehouse,
          notes,
          items: items.map(item => ({
            materialId: item.materialId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Tạo phiếu nhập kho thành công!');
        router.push('/inventory/import');
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (permLoading) return <div>Đang tải...</div>;

  if (!can('inventory.import', 'create')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📥 Tạo phiếu nhập kho</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          ← Quay lại
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kho nhập *</label>
          <select
            value={selectedWarehouse || ''}
            onChange={(e) => handleWarehouseChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Chọn kho --</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.warehouseName} ({wh.warehouseType === 'NVL' ? 'NVL' : 'Thành phẩm'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ghi chú về phiếu nhập..."
          />
        </div>
      </div>

      {selectedWarehouse && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Chi tiết nhập kho</h3>
            <button
              onClick={addItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ➕ Thêm mặt hàng
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có mặt hàng nào. Nhấn "Thêm mặt hàng" để bắt đầu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">STT</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mặt hàng *</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Số lượng *</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Đơn giá</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Thành tiền</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ghi chú</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">
                        <select
                          onChange={(e) => updateItem(index, 'select', e.target.value)}
                          className="w-full px-2 py-1 border rounded"
                        >
                          <option value="">-- Chọn --</option>
                          {warehouseType === 'NVL' 
                            ? materials.map(m => (
                                <option key={m.id} value={m.id}>{m.materialName}</option>
                              ))
                            : products.map(p => (
                                <option key={p.id} value={p.id}>{p.productName}</option>
                              ))
                          }
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          className="w-24 px-2 py-1 border rounded"
                          min="0"
                          step="0.01"
                        />
                        <span className="ml-1 text-sm text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                          className="w-32 px-2 py-1 border rounded"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          className="w-full px-2 py-1 border rounded"
                          placeholder="Ghi chú..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeItem(index)}
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

          {items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-500">Tổng tiền:</div>
                <div className="text-2xl font-bold text-blue-600">
                  {items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()} đ
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedWarehouse && items.length > 0 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
          </button>
        </div>
      )}
    </div>
  );
}
