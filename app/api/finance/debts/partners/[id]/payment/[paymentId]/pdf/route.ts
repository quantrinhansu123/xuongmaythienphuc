import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('finance.debts', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền xem phiếu thanh toán', { status: 403 });
    }

    const resolvedParams = await params;
    const partnerId = parseInt(resolvedParams.id);
    const paymentId = parseInt(resolvedParams.paymentId);

    // Lấy thông tin thanh toán từ URL params
    const { searchParams } = new URL(request.url);
    const partnerType = searchParams.get('type') as 'customer' | 'supplier';
    const paymentAmount = parseFloat(searchParams.get('amount') || '0');
    const paymentDate = searchParams.get('date') || new Date().toISOString();
    const paymentMethod = searchParams.get('method') || 'CASH';
    const bankAccountId = searchParams.get('bankAccountId');
    const notes = searchParams.get('notes') || '';

    if (!partnerType) {
      return new NextResponse('Thiếu thông tin loại đối tác', { status: 400 });
    }

    // Lấy thông tin đối tác
    const tableName = partnerType === 'customer' ? 'customers' : 'suppliers';
    const nameField = partnerType === 'customer' ? 'customer_name' : 'supplier_name';
    const codeField = partnerType === 'customer' ? 'customer_code' : 'supplier_code';

    const partnerResult = await query(
      `SELECT 
        ${nameField} as name,
        ${codeField} as code,
        phone,
        address
       FROM ${tableName}
       WHERE id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return new NextResponse('Không tìm thấy đối tác', { status: 404 });
    }

    const partner = partnerResult.rows[0];

    // Lấy thông tin tài khoản ngân hàng nếu có
    let bankAccount = null;
    if (bankAccountId) {
      const bankResult = await query(
        `SELECT bank_name, account_number, branch_name
         FROM bank_accounts
         WHERE id = $1`,
        [bankAccountId]
      );
      if (bankResult.rows.length > 0) {
        bankAccount = bankResult.rows[0];
      }
    }

    // Lấy thông tin công ty
    const companyResult = await query(
      `SELECT company_name, tax_code, address, phone, email 
       FROM company_config 
       LIMIT 1`
    );
    const company = companyResult.rows[0] || {};

    const isReceipt = partnerType === 'customer';
    const title = isReceipt ? 'PHIẾU THU CÔNG NỢ' : 'PHIẾU TRẢ CÔNG NỢ';
    const partnerLabel = partnerType === 'customer' ? 'Khách hàng' : 'Nhà cung cấp';

    const paymentMethodMap: any = {
      'CASH': 'Tiền mặt',
      'BANK': 'Ngân hàng',
      'TRANSFER': 'Chuyển khoản',
    };

    const paymentCode = `PT-${partnerType === 'customer' ? 'KH' : 'NCC'}${partnerId}-${paymentId}`;

    // Tạo HTML cho PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      padding: 30px 40px;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #1e40af;
    }
    .company-section {
      flex: 1;
    }
    .company-name { 
      font-size: 18px; 
      font-weight: bold; 
      color: #1e40af;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .company-info { 
      font-size: 12px; 
      color: #555; 
      line-height: 1.6; 
    }
    .logo-section {
      width: 80px;
      height: 80px;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #999;
    }
    
    /* Title */
    .title-section {
      text-align: center;
      margin: 25px 0;
      padding: 15px 0;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      border-radius: 8px;
    }
    .title { 
      font-size: 22px; 
      font-weight: bold; 
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .receipt-code { 
      font-size: 14px; 
      margin-top: 8px;
      opacity: 0.9;
    }
    .receipt-date { 
      font-size: 13px; 
      margin-top: 5px;
      font-style: italic;
      opacity: 0.85;
    }
    
    /* Content */
    .content { 
      margin: 25px 0; 
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .info-box-title {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .info-label {
      width: 100px;
      color: #64748b;
      flex-shrink: 0;
    }
    .info-value {
      flex: 1;
      font-weight: 500;
      color: #1e293b;
    }
    
    /* Amount Section */
    .amount-section {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-radius: 10px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .amount-label { 
      font-size: 14px; 
      color: #047857;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .amount-value { 
      font-size: 28px; 
      font-weight: bold; 
      color: #047857;
    }
    .amount-words { 
      font-size: 13px; 
      font-style: italic; 
      margin-top: 10px; 
      color: #065f46;
      padding-top: 10px;
      border-top: 1px dashed #10b981;
    }
    
    /* Payment Details */
    .payment-details {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin: 20px 0;
    }
    .payment-details-header {
      background: #f1f5f9;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 13px;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .payment-details-body {
      padding: 15px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #e2e8f0;
    }
    .payment-row:last-child {
      border-bottom: none;
    }
    .payment-row-label {
      color: #64748b;
    }
    .payment-row-value {
      font-weight: 500;
      color: #1e293b;
    }
    
    /* Notes */
    .notes-section {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .notes-title {
      font-size: 12px;
      color: #92400e;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 13px;
      color: #78350f;
      font-style: italic;
    }
    
    /* Signature */
    .signature-section { 
      margin-top: 50px; 
      display: flex; 
      justify-content: space-between;
      padding: 0 20px;
    }
    .signature-box { 
      text-align: center; 
      width: 150px; 
    }
    .signature-title { 
      font-weight: bold; 
      font-size: 13px;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .signature-subtitle { 
      font-size: 11px; 
      font-style: italic; 
      color: #64748b; 
      margin-bottom: 60px; 
    }
    .signature-name { 
      font-size: 13px;
      font-weight: 500;
      color: #1e293b;
    }
    
    /* Footer */
    .footer { 
      margin-top: 30px; 
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px; 
      color: #94a3b8; 
    }
    
    @media print {
      body { padding: 15px 25px; }
      .no-print { display: none; }
      .title-section {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .amount-section {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-section">
      <div class="company-name">${company.company_name || 'CÔNG TY'}</div>
      <div class="company-info">
        ${company.address ? `📍 ${company.address}<br>` : ''}
        ${company.phone ? `📞 ${company.phone}` : ''} ${company.email ? `&nbsp;&nbsp;✉️ ${company.email}` : ''}
        ${company.tax_code ? `<br>🏢 MST: ${company.tax_code}` : ''}
      </div>
    </div>
  </div>

  <div class="title-section">
    <div class="title">${title}</div>
    <div class="receipt-code">Số phiếu: ${paymentCode}</div>
    <div class="receipt-date">Ngày ${new Date(paymentDate).getDate()} tháng ${new Date(paymentDate).getMonth() + 1} năm ${new Date(paymentDate).getFullYear()}</div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Thông tin ${partnerLabel}</div>
        <div class="info-row">
          <div class="info-label">Mã:</div>
          <div class="info-value">${partner.code}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Tên:</div>
          <div class="info-value">${partner.name}</div>
        </div>
        ${partner.phone ? `
        <div class="info-row">
          <div class="info-label">Điện thoại:</div>
          <div class="info-value">${partner.phone}</div>
        </div>` : ''}
        ${partner.address ? `
        <div class="info-row">
          <div class="info-label">Địa chỉ:</div>
          <div class="info-value">${partner.address}</div>
        </div>` : ''}
      </div>
      
      <div class="info-box">
        <div class="info-box-title">Thông tin thanh toán</div>
        <div class="info-row">
          <div class="info-label">Phương thức:</div>
          <div class="info-value">${paymentMethodMap[paymentMethod] || paymentMethod}</div>
        </div>
        ${bankAccount ? `
        <div class="info-row">
          <div class="info-label">Ngân hàng:</div>
          <div class="info-value">${bankAccount.bank_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Số TK:</div>
          <div class="info-value">${bankAccount.account_number}</div>
        </div>
        ${bankAccount.branch_name ? `
        <div class="info-row">
          <div class="info-label">Chi nhánh:</div>
          <div class="info-value">${bankAccount.branch_name}</div>
        </div>` : ''}
        ` : ''}
        <div class="info-row">
          <div class="info-label">Lý do:</div>
          <div class="info-value">Thanh toán công nợ</div>
        </div>
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-label">💰 Số tiền thanh toán</div>
      <div class="amount-value">${paymentAmount.toLocaleString('vi-VN')} VNĐ</div>
      <div class="amount-words" id="amount-words"></div>
    </div>

    ${notes ? `
    <div class="notes-section">
      <div class="notes-title">📝 Ghi chú</div>
      <div class="notes-content">${notes}</div>
    </div>` : ''}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
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
    <div class="signature-box">
      <div class="signature-title">${partnerLabel}</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name">${partner.name}</div>
    </div>
  </div>

  <div class="footer">
    <div>Phiếu được in từ hệ thống quản lý</div>
    <div>In lúc: ${new Date().toLocaleString('vi-VN')}</div>
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
      const amountWords = numberToVietnameseWords(${paymentAmount});
      document.getElementById('amount-words').textContent = 'Bằng chữ: ' + amountWords;
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
