'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatQuantity } from '@/utils/format';
import { CalendarOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { DatePicker, Select, Table } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const { RangePicker } = DatePicker;

interface SalesSummary {
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  completedOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  waitingMaterialOrders: number;
  inProductionOrders: number;
  cancelledOrders: number;
  topCustomers: Array<{
    id: number;
    customerCode: string;
    customerName: string;
    totalOrders: number;
    totalAmount: number;
  }>;
  topItems: Array<{
    id: number;
    itemCode: string;
    itemName: string;
    unit: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
}

interface MonthlyData {
  month: string;
  orders: number;
  revenue: number;
  paid: number;
  unpaid: number;
}

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
  paid: number;
  unpaid: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  roleCode: string;
  branchId: number | null;
}

export default function SalesReportsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<User[]>([]);
  const [items, setItems] = useState<Array<{ id: number; itemCode: string; itemName: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [selectedSalesEmployeeId, setSelectedSalesEmployeeId] = useState<number | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'summary' | 'branch_comparison'>('summary');
  const [branchReportData, setBranchReportData] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<SalesSummary>({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    completedOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    waitingMaterialOrders: 0,
    inProductionOrders: 0,
    cancelledOrders: 0,
    topCustomers: [],
    topItems: [],
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'), // Đầu tháng
    dayjs(), // Hôm nay
  ]);

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
    fetchSalesEmployees();
    fetchItems();
  }, []);

  useEffect(() => {
    if (!can('sales.orders', 'view')) {
      setLoading(false);
      return;
    }
    if (currentUser) {
      if (viewMode === 'summary') {
        fetchReportData();
      } else {
        fetchBranchReport();
      }
    }
  }, [dateRange, selectedBranchId, selectedSalesEmployeeId, selectedItemId, currentUser, viewMode]);

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

  const fetchSalesEmployees = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=100');
      const data = await res.json();
      if (data.success) {
        setSalesEmployees(data.data.users || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/products/items?limit=1000'); // Fetch enough items
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const getQueryParams = () => {
    let queryParams = `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}`;

    if (selectedBranchId !== 'all') {
      queryParams += `&branchId=${selectedBranchId}`;
    }

    if (selectedSalesEmployeeId !== 'all') {
      queryParams += `&salesEmployeeId=${selectedSalesEmployeeId}`;
    }

    if (selectedItemId !== 'all') {
      queryParams += `&itemId=${selectedItemId}`;
    }

    return queryParams;
  }

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const queryParams = getQueryParams();

      // Fetch summary
      const summaryRes = await fetch(`/api/sales/reports/summary?${queryParams}`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Fetch monthly trend
      const monthlyRes = await fetch(`/api/sales/reports/monthly?${queryParams}`);
      const monthlyDataRes = await monthlyRes.json();
      if (monthlyDataRes.success) {
        setMonthlyData(monthlyDataRes.data);
      }

      // Fetch daily trend
      const dailyRes = await fetch(`/api/sales/reports/daily?${queryParams}`);
      const dailyDataRes = await dailyRes.json();
      if (dailyDataRes.success) {
        setDailyData(dailyDataRes.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchReport = async () => {
    setLoading(true);
    try {
      const queryParams = getQueryParams();
      const res = await fetch(`/api/sales/reports/by-branch?${queryParams}`);
      const data = await res.json();
      if (data.success) {
        setBranchReportData(data.data);
      }
    } catch (error) {
      console.error('Error fetching branch report:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleExportPDF = () => {
    alert('Chức năng xuất PDF đang được phát triển');
  };

  const handleRefresh = () => {
    if (viewMode === 'summary') {
      fetchReportData();
    } else {
      fetchBranchReport();
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const orderStatusData = [
    { name: 'Hoàn thành', value: summary.completedOrders, color: '#10B981' },
    { name: 'Đang sản xuất', value: summary.inProductionOrders, color: '#8B5CF6' },
    { name: 'Chờ nguyên liệu', value: summary.waitingMaterialOrders, color: '#F97316' },
    { name: 'Đã xác nhận', value: summary.confirmedOrders, color: '#3B82F6' },
    { name: 'Chờ xác nhận', value: summary.pendingOrders, color: '#F59E0B' },
    { name: 'Đã hủy', value: summary.cancelledOrders, color: '#EF4444' },
  ].filter(item => item.value > 0);

  return (
    <>
      <WrapperContent
        title="Báo cáo bán hàng"
        isNotAccessible={!can('sales.orders', 'view')}
        isLoading={loading}
        header={{
          customToolbar: (
            <div className="flex gap-3 items-center flex-wrap">
              <Select
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: 'Tổng quan', value: 'summary' },
                  { label: 'So sánh chi nhánh', value: 'branch_comparison' },
                ]}
                style={{ width: 160 }}
              />
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
              {isAdmin && viewMode === 'summary' && (
                <Select
                  style={{ width: 200 }}
                  placeholder="Chọn chi nhánh"
                  value={selectedBranchId}
                  onChange={(value: number | 'all') => setSelectedBranchId(value)}
                  options={[
                    { label: 'Tất cả chi nhánh', value: 'all' },
                    ...branches.map((b) => ({
                      label: b.branchName,
                      value: b.id,
                    })),
                  ]}
                />
              )}
              <Select
                style={{ width: 200 }}
                placeholder="Chọn nhân viên"
                value={selectedSalesEmployeeId}
                onChange={(value: number | 'all') => setSelectedSalesEmployeeId(value)}
                showSearch
                optionFilterProp="label"
                options={[
                  { label: 'Tất cả nhân viên', value: 'all' },
                  ...salesEmployees.map((e) => ({
                    label: e.fullName,
                    value: e.id,
                  })),
                ]}
              />
              <Select
                style={{ width: 250 }}
                placeholder="Lọc theo sản phẩm"
                value={selectedItemId}
                onChange={(value: number | 'all') => setSelectedItemId(value)}
                showSearch
                optionFilterProp="label"
                options={[
                  { label: 'Tất cả sản phẩm', value: 'all' },
                  ...items.map((i) => ({
                    label: `${i.itemCode} - ${i.itemName}`,
                    value: i.id,
                  })),
                ]}
              />
            </div>
          ),
          buttonEnds: [
            {
              type: 'default',
              name: 'Làm mới',
              onClick: handleRefresh,
              icon: <ReloadOutlined />,
            },
            {
              type: 'primary',
              name: 'Xuất PDF',
              onClick: handleExportPDF,
              icon: <DownloadOutlined />,
            },
          ],
        }}
      >
        <div className="space-y-6">

          {viewMode === 'summary' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="text-xs sm:text-sm text-blue-600 mb-1">Tổng đơn hàng</div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-700">
                    {summary.totalOrders}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {summary.completedOrders} hoàn thành
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="text-xs sm:text-sm text-green-600 mb-1">Tổng doanh thu</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-700 truncate">
                    {formatCurrency(summary.totalAmount)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                  <div className="text-xs sm:text-sm text-purple-600 mb-1">Đã thu</div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-700 truncate">
                    {formatCurrency(summary.totalPaid)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 sm:p-4 border border-orange-200">
                  <div className="text-xs sm:text-sm text-orange-600 mb-1">Còn nợ</div>
                  <div className="text-lg sm:text-2xl font-bold text-orange-700 truncate">
                    {formatCurrency(summary.totalUnpaid)}
                  </div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4">Xu hướng doanh thu theo tháng</h3>
                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Doanh thu" strokeWidth={2} />
                    <Line type="monotone" dataKey="paid" stroke="#8B5CF6" name="Đã thu" strokeWidth={2} />
                    <Line type="monotone" dataKey="unpaid" stroke="#F59E0B" name="Còn nợ" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Revenue Chart */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4">Doanh thu theo ngày</h3>
                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10B981" name="Doanh thu" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Order Status Pie Chart */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4">Trạng thái đơn hàng</h3>
                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Customers and Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Top Customers */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-4">Top 10 khách hàng</h3>
                  <div className="overflow-auto max-h-96">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã KH</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên KH</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Số ĐH</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summary.topCustomers.map((customer, index) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">
                              <span className="font-medium text-blue-600">#{index + 1}</span> {customer.customerCode}
                            </td>
                            <td className="px-4 py-2 text-sm">{customer.customerName}</td>
                            <td className="px-4 py-2 text-sm text-center">{customer.totalOrders}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                              {formatCurrency(customer.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-4">Top 10 sản phẩm bán chạy</h3>
                  <div className="overflow-auto max-h-96">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã SP</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên SP</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">SL bán</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summary.topItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">
                              <span className="font-medium text-blue-600">#{index + 1}</span> {item.itemCode}
                            </td>
                            <td className="px-4 py-2 text-sm">{item.itemName}</td>
                            <td className="px-4 py-2 text-sm text-center">
                              {formatQuantity(item.totalQuantity, item.unit)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                              {formatCurrency(item.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table
                dataSource={branchReportData}
                rowKey="branchId"
                pagination={false}
                columns={[
                  {
                    title: 'Tên chi nhánh',
                    dataIndex: 'branchName',
                    key: 'branchName',
                    render: (text) => <span className="font-medium text-blue-600">{text}</span>
                  },
                  {
                    title: 'Số đơn hàng',
                    dataIndex: 'totalOrders',
                    key: 'totalOrders',
                    align: 'center',
                  },
                  {
                    title: 'Doanh thu',
                    dataIndex: 'totalRevenue',
                    key: 'totalRevenue',
                    align: 'right',
                    render: (val) => <span className="text-green-600 font-medium">{formatCurrency(val)}</span>
                  },
                  {
                    title: 'Thực thu',
                    dataIndex: 'totalPaid',
                    key: 'totalPaid',
                    align: 'right',
                    render: (val) => <span className="text-purple-600 font-medium">{formatCurrency(val)}</span>
                  },
                  {
                    title: 'Còn nợ',
                    dataIndex: 'totalUnpaid',
                    key: 'totalUnpaid',
                    align: 'right',
                    render: (val) => <span className="text-orange-600 font-medium">{formatCurrency(val)}</span>
                  },
                ]}
              />
            </div>
          )}

        </div>
      </WrapperContent>
    </>
  );
}
