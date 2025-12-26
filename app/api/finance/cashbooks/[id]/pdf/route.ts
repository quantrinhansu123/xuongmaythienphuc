import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('finance.cashbooks', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền xem phiếu thu/chi', { status: 403 });
    }

    const resolvedParams = await params;
    const cashbookId = parseInt(resolvedParams.id);

    // Lấy thông tin phiếu thu/chi
    const result = await query(
      `SELECT 
        cb.id,
        cb.transaction_code as "transactionCode",
        cb.transaction_date as "transactionDate",
        cb.amount,
        cb.transaction_type as "transactionType",
        cb.payment_method as "paymentMethod",
        cb.description,
        fc.category_name as "categoryName",
        fc.category_code as "categoryCode",
        ba.account_number as "bankAccountNumber",
        ba.bank_name as "bankName",
        ba.branch_name as "bankBranchName",
        u.full_name as "createdBy",
        b.branch_name as "branchName",
        b.address as "branchAddress",
        b.phone as "branchPhone",
        cb.created_at as "createdAt"
       FROM cash_books cb
       LEFT JOIN financial_categories fc ON fc.id = cb.financial_category_id
       LEFT JOIN bank_accounts ba ON ba.id = cb.bank_account_id
       LEFT JOIN users u ON u.id = cb.created_by
       LEFT JOIN branches b ON b.id = cb.branch_id
       WHERE cb.id = $1`,
      [cashbookId]
    );

    if (result.rows.length === 0) {
      return new NextResponse('Không tìm thấy phiếu thu/chi', { status: 404 });
    }

    const cashbook = result.rows[0];

    // Lấy thông tin công ty
    const companyResult = await query(
      `SELECT company_name, tax_code, address, phone, email 
       FROM company_config 
       LIMIT 1`
    );
    const company = companyResult.rows[0] || {};

    const isReceipt = cashbook.transactionType === 'THU';
    const title = isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI';
    const personLabel = isReceipt ? 'Người nộp tiền' : 'Người nhận tiền';
    const reasonLabel = isReceipt ? 'Lý do thu' : 'Lý do chi';

    const paymentMethodMap: any = {
      'CASH': 'Tiền mặt',
      'BANK': 'Ngân hàng',
      'TRANSFER': 'Chuyển khoản',
    };

    // Tạo HTML cho PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; line-height: 1.6; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0 10px 0; text-transform: uppercase; }
    .receipt-code { text-align: center; font-size: 14px; margin-bottom: 5px; }
    .receipt-date { text-align: center; font-size: 14px; margin-bottom: 30px; font-style: italic; }
    .content { margin: 30px 0; }
    .row { display: flex; margin-bottom: 15px; font-size: 15px; line-height: 1.8; }
    .row-label { width: 180px; }
    .row-value { flex: 1; border-bottom: 1px dotted #666; min-height: 24px; }
    .row-value.no-border { border-bottom: none; }
    .amount-row { margin: 20px 0; padding: 15px; background-color: #f9fafb; border: 2px solid #000; }
    .amount-label { font-size: 15px; margin-bottom: 8px; }
    .amount-value { font-size: 22px; font-weight: bold; color: #1e40af; }
    .amount-words { font-size: 14px; font-style: italic; margin-top: 8px; color: #666; }
    .signature-section { margin-top: 60px; display: flex; justify-content: space-around; }
    .signature-box { text-align: center; width: 180px; }
    .signature-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
    .signature-subtitle { font-size: 12px; font-style: italic; color: #666; margin-bottom: 50px; }
    .signature-name { font-size: 14px; }
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company.company_name || 'CÔNG TY'}</div>
    <div class="company-info">
      ${company.address ? `${company.address}<br>` : ''}
      ${company.phone ? `ĐT: ${company.phone}` : ''} ${company.email ? `| Email: ${company.email}` : ''}
      ${company.tax_code ? `<br>MST: ${company.tax_code}` : ''}
    </div>
  </div>

  <div class="title">${title}</div>
  <div class="receipt-code">Số: <strong>${cashbook.transactionCode}</strong></div>
  <div class="receipt-date">Ngày ${new Date(cashbook.transactionDate).getDate()} tháng ${new Date(cashbook.transactionDate).getMonth() + 1} năm ${new Date(cashbook.transactionDate).getFullYear()}</div>

  <div class="content">
    <div class="row">
      <div class="row-label">${personLabel}:</div>
      <div class="row-value"></div>
    </div>

    <div class="row">
      <div class="row-label">${reasonLabel}:</div>
      <div class="row-value no-border"><strong>${cashbook.categoryName}</strong></div>
    </div>

    ${cashbook.description ? `
    <div class="row">
      <div class="row-label">Diễn giải:</div>
      <div class="row-value no-border">${cashbook.description}</div>
    </div>` : ''}

    <div class="amount-row">
      <div class="amount-label">Số tiền:</div>
      <div class="amount-value">${parseInt(cashbook.amount).toLocaleString('vi-VN')} đồng</div>
      <div class="amount-words" id="amount-words"></div>
    </div>

    <div class="row">
      <div class="row-label">Phương thức thanh toán:</div>
      <div class="row-value no-border"><strong>${paymentMethodMap[cashbook.paymentMethod] || cashbook.paymentMethod}</strong></div>
    </div>

    ${cashbook.bankAccountNumber ? `
    <div class="row">
      <div class="row-label">Tài khoản ngân hàng:</div>
      <div class="row-value no-border">${cashbook.bankName} - ${cashbook.bankAccountNumber}</div>
    </div>
    ${cashbook.bankBranchName ? `
    <div class="row">
      <div class="row-label">Chi nhánh ngân hàng:</div>
      <div class="row-value no-border">${cashbook.bankBranchName}</div>
    </div>` : ''}
    ` : ''}

    <div class="row">
      <div class="row-label">Chi nhánh:</div>
      <div class="row-value no-border">${cashbook.branchName}</div>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name">${cashbook.createdBy}</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Kế toán</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Thủ quỹ</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
  </div>

  <div class="footer">
    In lúc: ${new Date().toLocaleString('vi-VN')}
  </div>

  <script>
    function numberToVietnameseWords(num) {
      if (num === 0) return 'Không đồng';
      
      const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
      const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
      const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
      const thousands = ['', 'nghìn', 'triệu', 'tỷ'];
      
      function convertThreeDigits(n) {
        let result = '';
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        
        if (hundred > 0) {
          result += ones[hundred] + ' trăm';
          if (remainder > 0) result += ' ';
        }
        
        if (remainder >= 10 && remainder < 20) {
          result += teens[remainder - 10];
        } else {
          const ten = Math.floor(remainder / 10);
          const one = remainder % 10;
          
          if (ten > 0) {
            result += tens[ten];
            if (one > 0) result += ' ';
          }
          
          if (one > 0) {
            if (ten > 1 && one === 1) {
              result += 'mốt';
            } else if (ten > 0 && one === 5) {
              result += 'lăm';
            } else {
              result += ones[one];
            }
          }
        }
        
        return result;
      }
      
      let result = '';
      let unitIndex = 0;
      
      while (num > 0) {
        const threeDigits = num % 1000;
        if (threeDigits > 0) {
          const converted = convertThreeDigits(threeDigits);
          result = converted + (thousands[unitIndex] ? ' ' + thousands[unitIndex] : '') + (result ? ' ' + result : '');
        }
        num = Math.floor(num / 1000);
        unitIndex++;
      }
      
      return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    }

    window.onload = function() {
      const amountWords = numberToVietnameseWords(${parseInt(cashbook.amount)});
      document.getElementById('amount-words').textContent = '(Bằng chữ: ' + amountWords + ')';
      window.print();
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Generate PDF error:', error);
    return new NextResponse('Lỗi server', { status: 500 });
  }
}
