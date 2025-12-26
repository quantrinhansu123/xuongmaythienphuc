/**
 * VÍ DỤ: Tối ưu trang có nhiều tabs
 * Copy code này để áp dụng vào các trang của bạn
 */

'use client';

import OptimizedTabs from '@/components/OptimizedTabs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

// ============================================
// VÍ DỤ 1: Trang đơn giản với OptimizedTabs
// ============================================
export function SimpleTabsExample() {
  const tabs = [
    {
      key: 'tab1',
      label: 'Danh sách',
      icon: '📋',
      children: <Tab1Content />
    },
    {
      key: 'tab2',
      label: 'Thống kê',
      icon: '📊',
      children: <Tab2Content />
    },
    {
      key: 'tab3',
      label: 'Báo cáo',
      icon: '📈',
      children: <Tab3Content />
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Trang với Tabs tối ưu</h1>
      <OptimizedTabs tabs={tabs} defaultActiveKey="tab1" />
    </div>
  );
}

// ============================================
// VÍ DỤ 2: Tab content với React Query cache
// ============================================
function Tab1Content() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500);

  // React Query tự động cache data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tab1-data', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/data?search=${debouncedSearch}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
  });

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm..."
          className="px-3 py-2 border rounded flex-1"
        />
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          🔄 Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : (
        <div>
          {/* Render data */}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function Tab2Content() {
  // Tab này cũng dùng React Query
  const { data, isLoading } = useQuery({
    queryKey: ['tab2-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // Cache 10 phút vì stats ít thay đổi
  });

  if (isLoading) return <div>Đang tải thống kê...</div>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Thống kê</h3>
      {/* Render stats */}
    </div>
  );
}

function Tab3Content() {
  return <div>Nội dung tab 3</div>;
}

// ============================================
// VÍ DỤ 3: Trang Inventory tối ưu
// ============================================
export function OptimizedInventoryPage() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  // Fetch danh sách kho - cache lâu vì ít thay đổi
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/warehouses');
      const body = await res.json();
      return body.data || [];
    },
    staleTime: 30 * 60 * 1000, // Cache 30 phút
  });

  if (!warehouseId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Chọn kho</h2>
        <div className="grid grid-cols-3 gap-4">
          {warehouses?.map((wh: any) => (
            <button
              key={wh.id}
              onClick={() => setWarehouseId(wh.id)}
              className="p-4 border rounded hover:bg-gray-50"
            >
              {wh.warehouseName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    {
      key: 'balance',
      label: 'Tồn kho',
      icon: '📊',
      children: <BalanceTab warehouseId={warehouseId} />
    },
    {
      key: 'import',
      label: 'Nhập kho',
      icon: '📥',
      children: <ImportTab warehouseId={warehouseId} />
    },
    {
      key: 'export',
      label: 'Xuất kho',
      icon: '📤',
      children: <ExportTab warehouseId={warehouseId} />
    },
  ];

  return (
    <div className="p-6">
      <button
        onClick={() => setWarehouseId(null)}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Chọn kho khác
      </button>
      <OptimizedTabs tabs={tabs} />
    </div>
  );
}

// Tab components với React Query
function BalanceTab({ warehouseId }: { warehouseId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-balance', warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/balance?warehouseId=${warehouseId}`);
      return res.json();
    },
    staleTime: 3 * 60 * 1000, // Cache 3 phút
  });

  if (isLoading) return <div>Đang tải tồn kho...</div>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Tồn kho</h3>
      <table className="w-full">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên</th>
            <th>Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {data?.data?.map((item: any) => (
            <tr key={item.id}>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportTab({ warehouseId }: { warehouseId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-imports', warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/imports?warehouseId=${warehouseId}`);
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Cache 2 phút
  });

  if (isLoading) return <div>Đang tải lịch sử nhập...</div>;

  return <div>Lịch sử nhập kho</div>;
}

function ExportTab({ warehouseId }: { warehouseId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-exports', warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/exports?warehouseId=${warehouseId}`);
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Cache 2 phút
  });

  if (isLoading) return <div>Đang tải lịch sử xuất...</div>;

  return <div>Lịch sử xuất kho</div>;
}

// ============================================
// CÁCH SỬ DỤNG
// ============================================
/*

1. Import OptimizedTabs:
   import OptimizedTabs from '@/components/OptimizedTabs';

2. Tạo array tabs:
   const tabs = [
     { key: 'tab1', label: 'Tab 1', children: <Content1 /> },
     { key: 'tab2', label: 'Tab 2', children: <Content2 /> },
   ];

3. Render:
   <OptimizedTabs tabs={tabs} />

4. Trong mỗi tab content, dùng React Query:
   const { data } = useQuery({
     queryKey: ['my-data'],
     queryFn: fetchData,
     staleTime: 5 * 60 * 1000, // Cache 5 phút
   });

KẾT QUẢ:
- Chuyển tab tức thì (không re-render)
- Data được cache (không fetch lại)
- Trải nghiệm người dùng mượt mà

*/
