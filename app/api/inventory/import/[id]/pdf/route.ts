import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission } = await requirePermission('inventory.import', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền', { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    if (isNaN(transactionId)) {
      return new NextResponse('ID không hợp lệ', { status: 400 });
    }

    // Lấy thông tin phiếu
    const transResult = await query(
      `SELECT 
        it.transaction_code as "transactionCode",
        w.warehouse_name as "warehouseName",
        b.branch_name as "branchName",
        b.address as "branchAddress",
        it.notes,
        u.full_name as "createdBy",
        it.created_at as "createdAt",
        it.completed_at as "completedAt"
       FROM inventory_transactions it
       LEFT JOIN warehouses w ON w.id = it.to_warehouse_id
       LEFT JOIN branches b ON b.id = w.branch_id
       LEFT JOIN users u ON u.id = it.created_by
       WHERE it.id = $1`,
      [transactionId]
    );

    if (transResult.rows.length === 0) {
      return new NextResponse('Không tìm thấy phiếu', { status: 404 });
    }

    const transaction = transResult.rows[0];

    // Lấy thông tin công ty
    const companyResult = await query(
      `SELECT company_name as "companyName", tax_code as "taxCode", address, phone, email, header_text as "headerText"
       FROM company_config
       LIMIT 1`
    );
    const company = companyResult.rows[0] || {
      companyName: 'CÔNG TY',
      taxCode: '',
      address: '',
      phone: '',
      email: '',
      headerText: ''
    };

    // Lấy chi tiết
    const detailsResult = await query(
      `SELECT 
        COALESCE(m.material_code, p.product_code) as "itemCode",
        COALESCE(m.material_name, p.product_name) as "itemName",
        COALESCE(m.unit, p.unit) as unit,
        itd.quantity,
        itd.unit_price as "unitPrice",
        itd.total_amount as "totalAmount"
       FROM inventory_transaction_details itd
       LEFT JOIN materials m ON m.id = itd.material_id
       LEFT JOIN products p ON p.id = itd.product_id
       WHERE itd.transaction_id = $1`,
      [transactionId]
    );

    // Tạo HTML cho PDF (có thể dùng thư viện như puppeteer để convert sang PDF)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phiếu nhập kho ${transaction.transactionCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .company-header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .company-name { font-size: 18px; font-weight: bold; margin: 0; }
          .company-info { font-size: 12px; color: #666; margin: 2px 0; }
          .header { text-align: center; margin: 20px 0; }
          .header h1 { margin: 10px 0; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 16px; }
          .signature { margin-top: 50px; display: flex; justify-content: space-around; }
          .signature > div { text-align: center; }
          @media print {
            body { padding: 10px; }
          }
        </style>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </head>
      <body>
        <div class="company-header">
          <p class="company-name">${company.companyName}</p>
          ${company.taxCode ? `<p class="company-info">MST: ${company.taxCode}</p>` : ''}
          ${company.address ? `<p class="company-info">Địa chỉ: ${company.address}</p>` : ''}
          ${company.phone ? `<p class="company-info">ĐT: ${company.phone}</p>` : ''}
          ${company.email ? `<p class="company-info">Email: ${company.email}</p>` : ''}
        </div>
        
        <div class="header">
          <h1>${company.headerText || 'PHIẾU NHẬP KHO'}</h1>
          <h2>Số: ${transaction.transactionCode}</h2>
          <p style="font-style: italic; font-size: 14px;">Ngày ${new Date(transaction.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        
        <div class="info">
          <p><strong>Kho nhập:</strong> ${transaction.warehouseName}</p>
          <p><strong>Chi nhánh:</strong> ${transaction.branchName}</p>
          <p><strong>Người tạo:</strong> ${transaction.createdBy}</p>
          <p><strong>Ngày tạo:</strong> ${new Date(transaction.createdAt).toLocaleString('vi-VN')}</p>
          ${transaction.notes ? `<p><strong>Ghi chú:</strong> ${transaction.notes}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã hàng</th>
              <th>Tên hàng</th>
              <th>Số lượng</th>
              <th>Đơn vị</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${detailsResult.rows.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td style="text-align: right">${item.quantity}</td>
                <td>${item.unit}</td>
                <td style="text-align: right">${item.unitPrice?.toLocaleString() || 0}</td>
                <td style="text-align: right">${item.totalAmount?.toLocaleString() || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>Tổng cộng: ${detailsResult.rows.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toLocaleString()} đ</p>
        </div>

        <div class="signature">
          <div style="text-align: center;">
            <p><strong>Người lập phiếu</strong></p>
            <p style="margin-top: 60px;">${transaction.createdBy}</p>
          </div>
          <div style="text-align: center;">
            <p><strong>Thủ kho</strong></p>
            <p style="margin-top: 60px;">_______________</p>
          </div>
          <div style="text-align: center;">
            <p><strong>Giám đốc</strong></p>
            <p style="margin-top: 60px;">_______________</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Print PDF error:', error);
    return new NextResponse('Lỗi server', { status: 500 });
  }
}
