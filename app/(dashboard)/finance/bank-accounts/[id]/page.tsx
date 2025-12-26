'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { ArrowLeftOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { Card, DatePicker, Empty, Select, Spin, Statistic, Table, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;

interface BankAccount {
    id: number;
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    branchName?: string;
    balance: number;
    isActive: boolean;
    companyBranchName: string;
    branchId: number;
    createdAt: string;
    accountType?: 'BANK' | 'CASH';
}

interface Transaction {
    id: number;
    transactionCode: string;
    transactionDate: string;
    amount: number;
    transactionType: 'THU' | 'CHI';
    paymentMethod: string;
    description: string;
    categoryName: string;
    createdByName: string;
    createdAt: string;
}

export default function BankAccountDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { can, loading: permLoading } = usePermissions();
    const [account, setAccount] = useState<BankAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTx, setLoadingTx] = useState(true);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
        dayjs().subtract(3, 'month'),
        dayjs(),
    ]);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (params.id) {
            fetchAccount();
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) {
            fetchTransactions();
        }
    }, [params.id, dateRange, filterType]);

    const fetchAccount = async () => {
        try {
            const res = await fetch(`/api/finance/bank-accounts/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setAccount(data.data);
            }
        } catch (error) {
            console.error('Error fetching account:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        setLoadingTx(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');
            let url = `/api/finance/bank-accounts/${params.id}/transactions?startDate=${startDate}&endDate=${endDate}`;
            if (filterType) {
                url += `&type=${filterType}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoadingTx(false);
        }
    };

    if (loading || permLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Empty description="Không tìm thấy tài khoản" />
                <button
                    onClick={() => router.push('/finance/bank-accounts')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const isCash = account.accountType === 'CASH' || account.bankName === 'Tiền mặt';

    const totalThu = transactions
        .filter(t => t.transactionType === 'THU')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalChi = transactions
        .filter(t => t.transactionType === 'CHI')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const columns = [
        {
            title: 'Mã GD',
            dataIndex: 'transactionCode',
            key: 'transactionCode',
            width: 130,
            render: (code: string) => <span className="font-medium text-blue-600">{code}</span>,
        },
        {
            title: 'Ngày',
            dataIndex: 'transactionDate',
            key: 'transactionDate',
            width: 100,
            render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
        },
        {
            title: 'Loại',
            dataIndex: 'transactionType',
            key: 'transactionType',
            width: 80,
            render: (type: string) => (
                <Tag color={type === 'THU' ? 'green' : 'red'}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            width: 150,
            align: 'right' as const,
            render: (amount: number, record: Transaction) => (
                <span className={`font-semibold ${record.transactionType === 'THU' ? 'text-green-600' : 'text-red-600'}`}>
                    {record.transactionType === 'THU' ? '+' : '-'}{formatCurrency(amount)}
                </span>
            ),
        },
        {
            title: 'Danh mục',
            dataIndex: 'categoryName',
            key: 'categoryName',
            width: 150,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Người tạo',
            dataIndex: 'createdByName',
            key: 'createdByName',
            width: 120,
        },
    ];

    return (
        <WrapperContent
            title=""
            isNotAccessible={!can('finance.cashbooks', 'view')}
            isLoading={loading}
            header={{
                customToolbar: (
                    <div className="flex gap-2 items-center flex-nowrap">
                        <button
                            onClick={() => router.push('/finance/bank-accounts')}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"
                        >
                            <ArrowLeftOutlined /> Quay lại
                        </button>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0], dates[1]]);
                                }
                            }}
                            format="DD/MM/YYYY"
                            size="middle"
                            style={{ width: 240 }}
                            suffixIcon={<CalendarOutlined />}
                            presets={[
                                { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
                                { label: '3 tháng', value: [dayjs().subtract(3, 'month'), dayjs()] },
                                { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs()] },
                            ]}
                        />
                        <Select
                            style={{ width: 90 }}
                            placeholder="Loại"
                            allowClear
                            size="middle"
                            value={filterType}
                            onChange={(value) => setFilterType(value)}
                            options={[
                                { label: 'Thu', value: 'THU' },
                                { label: 'Chi', value: 'CHI' },
                            ]}
                        />
                    </div>
                ),
                buttonEnds: [
                    {
                        type: 'default',
                        name: 'Làm mới',
                        onClick: () => {
                            fetchAccount();
                            fetchTransactions();
                        },
                        icon: <ReloadOutlined />,
                    },
                ],
            }}
        >
            <div className="space-y-4">
                {/* Card thông tin tài khoản */}
                <Card>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${isCash ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                            {isCash ? '💵' : '🏦'}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {account.accountNumber}
                                </h1>
                                <Tag color={account.isActive ? 'green' : 'default'}>
                                    {account.isActive ? 'Hoạt động' : 'Ngừng'}
                                </Tag>
                                <Tag color={isCash ? 'green' : 'blue'}>
                                    {isCash ? 'Tiền mặt' : 'Ngân hàng'}
                                </Tag>
                            </div>
                            <div className="text-gray-500 mt-1">
                                {account.accountHolder}
                                {!isCash && ` • ${account.bankName}`}
                                {account.companyBranchName && ` • ${account.companyBranchName}`}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Số dư hiện tại</div>
                            <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(account.balance)}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Thống kê */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <Statistic
                            title="Tổng thu trong kỳ"
                            value={totalThu}
                            precision={0}
                            valueStyle={{ color: '#52c41a' }}
                            prefix="+"
                            suffix="đ"
                            formatter={(value) => value?.toLocaleString('vi-VN')}
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            {transactions.filter(t => t.transactionType === 'THU').length} giao dịch
                        </div>
                    </Card>
                    <Card>
                        <Statistic
                            title="Tổng chi trong kỳ"
                            value={totalChi}
                            precision={0}
                            valueStyle={{ color: '#ff4d4f' }}
                            prefix="-"
                            suffix="đ"
                            formatter={(value) => value?.toLocaleString('vi-VN')}
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            {transactions.filter(t => t.transactionType === 'CHI').length} giao dịch
                        </div>
                    </Card>
                    <Card>
                        <Statistic
                            title="Chênh lệch"
                            value={totalThu - totalChi}
                            precision={0}
                            valueStyle={{ color: totalThu - totalChi >= 0 ? '#1890ff' : '#ff4d4f' }}
                            suffix="đ"
                            formatter={(value) => value?.toLocaleString('vi-VN')}
                        />
                        <div className="text-xs text-gray-400 mt-1">
                            Trong kỳ đã chọn
                        </div>
                    </Card>
                </div>

                {/* Bảng giao dịch */}
                <Card
                    title={
                        <div className="flex items-center gap-2">
                            <span>Lịch sử giao dịch</span>
                            <Tag>{transactions.length} giao dịch</Tag>
                        </div>
                    }
                    extra={
                        <span className="text-gray-500 text-sm">
                            {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
                        </span>
                    }
                >
                    <Table
                        columns={columns}
                        dataSource={transactions}
                        rowKey="id"
                        loading={loadingTx}
                        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng ${total} giao dịch` }}
                        locale={{ emptyText: <Empty description="Không có giao dịch nào trong khoảng thời gian này" /> }}
                        size="middle"
                    />
                </Card>
            </div>
        </WrapperContent>
    );
}
