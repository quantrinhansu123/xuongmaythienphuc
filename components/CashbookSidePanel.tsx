import React, { useState } from 'react';

interface CashBook {
  id: number;
  transactionCode: string;
  transactionDate: string;
  amount: number;
  transactionType: 'THU' | 'CHI';
  paymentMethod: 'CASH' | 'BANK' | 'TRANSFER';
  description: string;
  categoryName: string;
  categoryCode: string;
  categoryId: number;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountId?: number;
  createdByName: string;
  branchName: string;
  createdAt: string;
}

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

interface Props {
  cashbook: CashBook;
  onClose: () => void;
}

export default function CashbookSidePanel({
  cashbook,
  onClose,
}: Props) {

  const handlePrint = () => {
    window.open(`/api/finance/cashbooks/${cashbook.id}/pdf`, '_blank');
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">
            {cashbook.transactionType === 'THU' ? 'Phiếu thu' : 'Phiếu chi'}
          </h2>
          <p className="text-sm text-gray-600">{cashbook.transactionCode}</p>
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
        {/* View Mode */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngày giao dịch:</span>
                <span className="font-medium">
                  {new Date(cashbook.transactionDate).toLocaleDateString('vi-VN')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Loại:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  cashbook.transactionType === 'THU' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {cashbook.transactionType}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Danh mục:</span>
                <span className="font-medium">{cashbook.categoryName}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">Số tiền:</span>
                <span className="text-xl font-bold text-blue-600">
                  {parseFloat(cashbook.amount.toString()).toLocaleString('vi-VN')} đ
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Phương thức:</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {cashbook.paymentMethod === 'CASH' ? 'Tiền mặt' : 
                   cashbook.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Chuyển khoản'}
                </span>
              </div>
              
              {cashbook.bankAccountNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tài khoản:</span>
                  <span className="text-sm">
                    {cashbook.bankName} - {cashbook.bankAccountNumber}
                  </span>
                </div>
              )}
              
              {cashbook.description && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-gray-600">Mô tả:</span>
                  <p className="mt-1 text-sm">{cashbook.description}</p>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">Chi nhánh:</span>
                <span className="text-sm">{cashbook.branchName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Người tạo:</span>
                <span className="text-sm">{cashbook.createdByName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngày tạo:</span>
                <span className="text-sm">
                  {new Date(cashbook.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            🖨️ In phiếu
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">💡 Lưu ý:</div>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Phiếu thu/chi không thể chỉnh sửa hoặc xóa sau khi tạo</li>
              <li>Click "In phiếu" để in hoặc lưu PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
