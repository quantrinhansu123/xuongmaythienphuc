import React, { useState } from 'react';

interface Order {
  id: number;
  orderCode: string;
  orderDate: string;
  totalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  status: string;
  notes?: string;
  customerName?: string;
  supplierName?: string;
  branchName: string;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface Props {
  orders: Order[];
  partnerName: string;
  partnerCode: string;
  orderType: 'order' | 'purchase_order';
  bankAccounts: BankAccount[];
  canEdit: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function OrderDebtSidePanel({
  orders,
  partnerName,
  partnerCode,
  orderType,
  bankAccounts,
  canEdit,
  onClose,
  onPaymentSuccess,
}: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'TRANSFER',
    bankAccountId: '',
    notes: '',
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const res = await fetch(`/api/finance/debts/orders/${selectedOrder.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentFormData,
          paymentAmount: parseFloat(paymentFormData.paymentAmount),
          bankAccountId: paymentFormData.bankAccountId ? parseInt(paymentFormData.bankAccountId) : null,
          orderType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Thanh toán thành công!');
        setSelectedOrder(null);
        setPaymentFormData({
          paymentAmount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'CASH',
          bankAccountId: '',
          notes: '',
        });
        onPaymentSuccess();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || o.finalAmount?.toString() || '0'), 0);
  const totalPaid = orders.reduce((sum, o) => sum + parseFloat(o.paidAmount.toString()), 0);
  const totalRemaining = orders.reduce((sum, o) => sum + parseFloat(o.remainingAmount.toString()), 0);

  return (
    <div className="fixed right-0 top-0 h-full w-[700px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">
            {orderType === 'order' ? 'Đơn hàng' : 'Đơn mua'} - {partnerName}
          </h2>
          <p className="text-sm text-gray-600">{partnerCode}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Tổng hợp</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-600">Tổng tiền</div>
              <div className="font-bold text-lg">
                {totalAmount.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-xs text-green-600">Đã trả</div>
              <div className="font-bold text-lg text-green-700">
                {totalPaid.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="text-xs text-orange-600">Còn lại</div>
              <div className="font-bold text-lg text-orange-700">
                {totalRemaining.toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div>
          <h3 className="font-medium mb-3">Danh sách {orderType === 'order' ? 'đơn hàng' : 'đơn mua'}</h3>
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`border rounded-lg p-4 ${
                  selectedOrder?.id === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{order.orderCode}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.paymentStatus === 'PAID' ? 'Đã TT' :
                     order.paymentStatus === 'PARTIAL' ? 'TT 1 phần' : 'Chưa TT'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-xs text-gray-600">Tổng tiền</div>
                    <div className="font-medium">
                      {parseFloat((order.finalAmount || order.totalAmount || 0).toString()).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Đã trả</div>
                    <div className="font-medium text-green-600">
                      {parseFloat(order.paidAmount.toString()).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Còn lại</div>
                    <div className="font-medium text-orange-600">
                      {parseFloat(order.remainingAmount.toString()).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                {canEdit && order.remainingAmount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setPaymentFormData({
                        ...paymentFormData,
                        paymentAmount: order.remainingAmount.toString(),
                      });
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Thanh toán
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        {selectedOrder && canEdit && (
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Thanh toán đơn: {selectedOrder.orderCode}</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền thanh toán *</label>
                <input
                  type="number"
                  value={paymentFormData.paymentAmount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  min="0"
                  max={selectedOrder.remainingAmount}
                  step="0.01"
                  placeholder={`Tối đa: ${parseFloat(selectedOrder.remainingAmount.toString()).toLocaleString('vi-VN')} đ`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày thanh toán *</label>
                <input
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phương thức *</label>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Ngân hàng</option>
                  <option value="TRANSFER">Chuyển khoản</option>
                </select>
              </div>

              {(paymentFormData.paymentMethod === 'BANK' || paymentFormData.paymentMethod === 'TRANSFER') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tài khoản ngân hàng *</label>
                  <select
                    value={paymentFormData.bankAccountId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">-- Chọn tài khoản --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Xác nhận thanh toán
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
