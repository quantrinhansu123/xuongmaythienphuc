'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import ImportTab from './components/ImportTab';
import ExportTab from './components/ExportTab';
import TransferTab from './components/TransferTab';
import HistoryTab from './components/HistoryTab';

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: 'NVL' | 'THANH_PHAM';
  branchId: number;
  branchName: string;
}

interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
}

type TabType = 'balance' | 'import' | 'export' | 'transfer' | 'history';

export default function InventoryPage() {
  const { can, loading: permLoading } = usePermissions();
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouseId');
  
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('balance');

  useEffect(() => {
    if (warehouseId) {
      fetchWarehouseAndInventory(parseInt(warehouseId));
    } else {
      setLoading(false);
    }
  }, [warehouseId]);

  const fetchWarehouseAndInventory = async (whId: number) => {
    setLoading(true);
    try {
      const warehouseRes = await fetch('/api/inventory/warehouses');
      const warehouseData = await warehouseRes.json();
      
      if (warehouseData.success) {
        const selectedWh = warehouseData.data.find((wh: Warehouse) => wh.id === whId);
        if (selectedWh) {
          setWarehouse(selectedWh);
          await fetchInventoryItems(selectedWh.id, selectedWh.warehouseType);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async (whId: number, type: string) => {
    setLoadingItems(true);
    try {
      const endpoint = type === 'NVL' 
        ? `/api/inventory/materials?warehouseId=${whId}`
        : `/api/inventory/products?warehouseId=${whId}`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setInventoryItems(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <div className="text-gray-500">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!can('inventory.balance', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem tồn kho</p>
      </div>
    );
  }

  const tabs = [
    { id: 'balance' as TabType, label: '📊 Tồn kho', permission: 'inventory.balance' },
    { id: 'import' as TabType, label: '📥 Nhập kho', permission: 'inventory.import' },
    { id: 'export' as TabType, label: '📤 Xuất kho', permission: 'inventory.export' },
    { id: 'transfer' as TabType, label: '🔄 Luân chuyển', permission: 'inventory.transfer' },
    { id: 'history' as TabType, label: '📜 Lịch sử', permission: 'inventory.balance' },
  ].filter(tab => can(tab.permission, 'view'));

  return (
    <div>
      {warehouse ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{warehouse.warehouseName}</h2>
                <div className="text-sm text-gray-500">
                  Mã: <span className="font-mono font-medium">{warehouse.warehouseCode}</span> | 
                  Chi nhánh: <span className="font-medium">{warehouse.branchName}</span>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                warehouse.warehouseType === 'NVL' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
              }`}>
                {warehouse.warehouseType === 'NVL' ? '📦 NVL' : '✨ Thành phẩm'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'balance' && (
                <div>
                  {loadingItems ? (
                    <div className="text-center py-12 text-gray-500">Đang tải...</div>
                  ) : inventoryItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">📦</div>
                      <div>Kho trống</div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inventoryItems.map((item, idx) => (
                          <tr key={`${item.itemCode}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{item.itemCode}</td>
                            <td className="px-4 py-3 text-sm font-medium">{item.itemName}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'import' && (
                <ImportTab 
                  warehouseId={warehouse.id} 
                  warehouseName={warehouse.warehouseName}
                  warehouseType={warehouse.warehouseType} 
                />
              )}

              {activeTab === 'export' && (
                <ExportTab 
                  warehouseId={warehouse.id}
                  warehouseName={warehouse.warehouseName}
                  warehouseType={warehouse.warehouseType} 
                />
              )}

              {activeTab === 'transfer' && (
                <TransferTab warehouseId={warehouse.id} warehouseType={warehouse.warehouseType} />
              )}

              {activeTab === 'history' && (
                <HistoryTab warehouseId={warehouse.id} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🏪</div>
            <div className="text-lg font-medium mb-2">Chọn một kho để xem chi tiết</div>
            <div className="text-sm">Danh sách kho hiển thị ở menu bên trái</div>
          </div>
        </div>
      )}
    </div>
  );
}
