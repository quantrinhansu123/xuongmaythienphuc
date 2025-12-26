import React from 'react';

interface Debt {
  id: number;
  debtCode: string;
  debtType: 'RECEIVABLE' | 'PAYABLE';
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierPhone?: string;
  referenceType?: string;
  referenceId?: number;
  notes: string;
  createdAt: string;
}

interface DebtPayment {
  id: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  bankAccountNumber?: string;
  bankName?: string;
  createdByName: string;
  notes: string;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface Props {
  debt: Debt;
  debts: Debt[];
  payments: DebtPayment[];
  bankAccounts: BankAccount[];
  canEdit: boolean;
  onClose: () => void;
  onSelectDebt: (debt: Debt) => void;
  onPaymentSubmit: (e: React.FormEvent) => void;
  paymentFormData: {
    paymentAmount: string;
    paymentDate: string;
    paymentMethod: 'CASH' | 'BANK' | 'TRANSFER';
    bankAccountId: string;
    notes: string;
  };
  setPaymentFormData: (data: any) => void;
}

export default function DebtSidePanel({
  debt,
  debts,
  payments,
  bankAccounts,
  canEdit,
  onClose,
  onSelectDebt,
  onPaymentSubmit,
  paymentFormData,
  setPaymentFormData,
}: Props) {
  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">Chi tiết công nợ</h2>
          <p className="text-sm text-gray-600">{debt.debtCode}</p>
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
        {/* Debt Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Loại công nợ</div>
              <div className="font-medium">
                <span className={`px-2 py-1 rounded text-sm ${
                  debt.debtType === 'RECEIVABLE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {debt.debtType === 'RECEIVABLE' ? 'Phải thu' : 'Phải trả'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Trạng thái</div>
              <div className="font-medium">
                <span className={`px-2 py-1 rounded text-sm ${
                  debt.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  debt.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                  debt.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {debt.status === 'PAID' ? 'Đã thanh toán' :
                   debt.status === 'PARTIAL' ? 'Thanh toán 1 phần' :
                   debt.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa thanh toán'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Đối tác</div>
              <div className="font-medium">
                {debt.customerName || debt.supplierName}
              </div>
              <div className="text-xs text-gray-500">
                {debt.customerCode || debt.supplierCode}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Hạn thanh toán</div>
              <div className="font-medium">
                {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('vi-VN') : '-'}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600 mb-2">Chi tiết thanh toán</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-gray-600">Tổng tiền</div>
                  <div className="font-bold text-lg">
                    {parseFloat(debt.originalAmount.toString()).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="text-xs text-green-600">Đã trả</div>
                  <div className="font-bold text-lg text-green-700">
                    {parseFloat((debt.paidAmount || 0).toString()).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <div className="text-xs text-orange-600">Còn lại</div>
                  <div className="font-bold text-lg text-orange-700">
                    {parseFloat(debt.remainingAmount.toString()).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {debt.notes && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">Ghi chú</div>
              <div className="text-sm mt-1">{debt.notes}</div>
            </div>
          )}
        </div>

        {/* Payment Form */}
        {canEdit && debt.status !== 'PAID' && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-4">Thanh toán công nợ</h3>
            <form onSubmit={onPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền thanh toán *</label>
                <input
                  type="number"
                  value={paymentFormData.paymentAmount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  min="0"
                  max={debt.remainingAmount}
                  step="0.01"
                  placeholder={`Tối đa: ${parseFloat(debt.remainingAmount.toString()).toLocaleString('vi-VN')} đ`}
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

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Xác nhận thanh toán
              </button>
            </form>
          </div>
        )}

        {/* Payment History */}
        <div>
          <h3 className="font-medium mb-3">Lịch sử thanh toán</h3>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded">
              Chưa có lịch sử thanh toán
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-lg">
                        {parseFloat(payment.paymentAmount.toString()).toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(payment.paymentDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {payment.paymentMethod === 'CASH' ? 'Tiền mặt' : 
                       payment.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Chuyển khoản'}
                    </span>
                  </div>
                  {payment.bankAccountNumber && (
                    <div className="text-xs text-gray-600 mb-1">
                      🏦 {payment.bankName} - {payment.bankAccountNumber}
                    </div>
                  )}
                  {payment.notes && (
                    <div className="text-sm text-gray-600 mt-2 pt-2 border-t">
                      {payment.notes}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Người tạo: {payment.createdByName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Debts of this Partner */}
        <div>
          <h3 className="font-medium mb-3">Tất cả công nợ của đối tác</h3>
          <div className="space-y-2">
            {debts
              .filter(d => 
                (d.customerName === debt.customerName && d.customerName) ||
                (d.supplierName === debt.supplierName && d.supplierName)
              )
              .map((d) => (
                <div
                  key={d.id}
                  className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                    d.id === debt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => onSelectDebt(d)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{d.debtCode}</div>
                      <div className="text-xs text-gray-600">
                        {d.dueDate ? new Date(d.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {parseFloat(d.remainingAmount.toString()).toLocaleString('vi-VN')} đ
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        d.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        d.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {d.status === 'PAID' ? 'Đã TT' :
                         d.status === 'PARTIAL' ? 'TT 1 phần' : 'Chưa TT'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
