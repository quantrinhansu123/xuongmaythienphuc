'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowRightOutlined, CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import { DatePicker, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const { RangePicker } = DatePicker;

interface CustomerSummary {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface SupplierSummary {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

interface User {
  id: number;
  username: string;
  roleCode: string;
  branchId: number | null;
}

export default function DebtsReportPage() {
  const { can } = usePermissions();
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), // Đầu tháng
    dayjs(), // Hôm nay
  ]);

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [selectedBranchId, currentUser, dateRange]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.user);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchData = async () => {
    try {
      const branchParam = selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : '';
      const dateParams = dateRange 
        ? `&startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}`
        : '';
      
      const [customersRes, suppliersRes] = await Promise.all([
        fetch(`/api/finance/debts/summary?type=customers${branchParam}${dateParams}`),
        fetch(`/api/finance/debts/summary?type=suppliers${branchParam}${dateParams}`),
      ]);

      const customersData = await customersRes.json();
      const suppliersData = await suppliersRes.json();

      if (customersData.success) setCustomerSummaries(customersData.data);
      if (suppliersData.success) setSupplierSummaries(suppliersData.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const totalReceivable = customerSummaries.reduce((sum, c) => sum + parseFloat(c.remainingAmount?.toString() || '0'), 0);
  const totalPayable = supplierSummaries.reduce((sum, s) => sum + parseFloat(s.remainingAmount?.toString() || '0'), 0);
  const netDebt = totalReceivable - totalPayable;

  const customersWithDebt = customerSummaries.filter(c => c.remainingAmount > 0);
  const suppliersWithDebt = supplierSummaries.filter(s => s.remainingAmount > 0);

  const topCustomers = [...customersWithDebt]
    .sort((a, b) => parseFloat(b.remainingAmount.toString()) - parseFloat(a.remainingAmount.toString()))
    .slice(0, 5);

  const topSuppliers = [...suppliersWithDebt]
    .sort((a, b) => parseFloat(b.remainingAmount.toString()) - parseFloat(a.remainingAmount.toString()))
    .slice(0, 5);

  return (
    <WrapperContent
      title="Báo cáo công nợ"
      isNotAccessible={!can('finance.debts', 'view')}
      isLoading={loading}
      header={{
        refetchDataWithKeys: ['debts'],
        customToolbar: (
          <div className="flex items-center gap-2 flex-wrap">
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              suffixIcon={<CalendarOutlined />}
              presets={[
                { label: 'Hôm nay', value: [dayjs(), dayjs()] },
                { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs()] },
                { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
                { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                { label: 'Quý này', value: [dayjs().startOf('month').subtract(2, 'month'), dayjs()] },
                { label: 'Năm này', value: [dayjs().startOf('year'), dayjs()] },
              ]}
            />
            {isAdmin && (
              <Select
                style={{ width: 200 }}
                placeholder="Chọn chi nhánh"
                value={selectedBranchId}
                onChange={(value) => setSelectedBranchId(value)}
                options={[
                  { label: 'Tất cả chi nhánh', value: 'all' },
                  ...branches.map((b) => ({
                    label: b.branchName,
                    value: b.id,
                  })),
                ]}
              />
            )}
            <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
              <DownloadOutlined /> Xuất báo cáo
            </button>
          </div>
        ),
      }}
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-green-600">Tổng phải thu</div>
              <Link href="/sales/debts" className="text-green-600 hover:text-green-800">
                <ArrowRightOutlined />
              </Link>
            </div>
            <div className="text-3xl font-bold text-green-700 mb-1">
              {totalReceivable.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-green-600">
              {customersWithDebt.length} khách hàng có công nợ
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border-2 border-red-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-red-600">Tổng phải trả</div>
              <Link href="/purchasing/debts" className="text-red-600 hover:text-red-800">
                <ArrowRightOutlined />
              </Link>
            </div>
            <div className="text-3xl font-bold text-red-700 mb-1">
              {totalPayable.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-red-600">
              {suppliersWithDebt.length} nhà cung cấp có công nợ
            </div>
          </div>

          <div className={`p-6 rounded-lg border-2 shadow-sm ${
            netDebt >= 0 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="text-sm font-medium mb-2" style={{ color: netDebt >= 0 ? '#2563eb' : '#ea580c' }}>
              Công nợ ròng
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: netDebt >= 0 ? '#1e40af' : '#c2410c' }}>
              {Math.abs(netDebt).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs" style={{ color: netDebt >= 0 ? '#2563eb' : '#ea580c' }}>
              {netDebt >= 0 ? 'Khách hàng nợ nhiều hơn' : 'Nợ nhà cung cấp nhiều hơn'}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Comparison */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">So sánh phải thu / phải trả</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Công nợ',
                    'Phải thu': totalReceivable,
                    'Phải trả': totalPayable,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'} />
                <Legend />
                <Bar dataKey="Phải thu" fill="#16a34a" />
                <Bar dataKey="Phải trả" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố công nợ</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Phải thu (KH)', value: totalReceivable, color: '#16a34a' },
                    { name: 'Phải trả (NCC)', value: totalPayable, color: '#dc2626' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Phải thu (KH)', value: totalReceivable, color: '#16a34a' },
                    { name: 'Phải trả (NCC)', value: totalPayable, color: '#dc2626' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString('vi-VN') + ' đ'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Debtors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-green-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-700">
                  Top 5 khách hàng nợ nhiều nhất
                </h3>
                <Link 
                  href="/sales/debts" 
                  className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                >
                  Xem tất cả <ArrowRightOutlined />
                </Link>
              </div>
            </div>
            <div className="p-6">
              {topCustomers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Không có khách hàng nào có công nợ
                </div>
              ) : (
                <div className="space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{customer.customerName}</div>
                          <div className="text-xs text-gray-500">
                            {customer.customerCode} • {customer.unpaidOrders} đơn chưa thanh toán
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-700">
                          {parseFloat(customer.remainingAmount.toString()).toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-xs text-gray-500">
                          / {parseFloat(customer.totalAmount.toString()).toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-red-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-red-700">
                  Top 5 nhà cung cấp nợ nhiều nhất
                </h3>
                <Link 
                  href="/purchasing/debts" 
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  Xem tất cả <ArrowRightOutlined />
                </Link>
              </div>
            </div>
            <div className="p-6">
              {topSuppliers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Không có nhà cung cấp nào có công nợ
                </div>
              ) : (
                <div className="space-y-4">
                  {topSuppliers.map((supplier, index) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{supplier.supplierName}</div>
                          <div className="text-xs text-gray-500">
                            {supplier.supplierCode} • {supplier.unpaidOrders} đơn chưa thanh toán
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-700">
                          {parseFloat(supplier.remainingAmount.toString()).toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-xs text-gray-500">
                          / {parseFloat(supplier.totalAmount.toString()).toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Tổng khách hàng</div>
            <div className="text-2xl font-bold text-gray-900">{customerSummaries.length}</div>
            <div className="text-xs text-green-600 mt-1">
              {customersWithDebt.length} có công nợ
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Tổng nhà cung cấp</div>
            <div className="text-2xl font-bold text-gray-900">{supplierSummaries.length}</div>
            <div className="text-xs text-red-600 mt-1">
              {suppliersWithDebt.length} có công nợ
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Đơn hàng chưa TT (KH)</div>
            <div className="text-2xl font-bold text-gray-900">
              {customerSummaries.reduce((sum, c) => sum + c.unpaidOrders, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              / {customerSummaries.reduce((sum, c) => sum + c.totalOrders, 0)} tổng đơn
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Đơn mua chưa TT (NCC)</div>
            <div className="text-2xl font-bold text-gray-900">
              {supplierSummaries.reduce((sum, s) => sum + s.unpaidOrders, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              / {supplierSummaries.reduce((sum, s) => sum + s.totalOrders, 0)} tổng đơn
            </div>
          </div>
        </div>
      </div>
    </WrapperContent>
  );
}
