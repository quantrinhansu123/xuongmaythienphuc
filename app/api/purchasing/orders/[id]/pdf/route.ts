import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.orders', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền xem đơn đặt hàng', { status: 403 });
    }

    const resolvedParams = await params;
    const poId = parseInt(resolvedParams.id);

    // Lấy thông tin đơn đặt hàng
    const poResult = await query(
      `SELECT 
        po.id,
        po.po_code as "poCode",
        s.supplier_name as "supplierName",
        s.phone as "supplierPhone",
        s.address as "supplierAddress",
        po.order_date as "orderDate",
        po.expected_date as "expectedDate",
        po.total_amount as "totalAmount",
        po.status,
        po.notes,
        u.full_name as "createdBy",
        po.created_at as "createdAt",
        b.branch_name as "branchName",
        b.address as "branchAddress",
        b.phone as "branchPhone"
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN users u ON u.id = po.created_by
       LEFT JOIN branches b ON b.id = po.branch_id
       WHERE po.id = $1`,
      [poId]
    );

    if (poResult.rows.length === 0) {
      return new NextResponse('Không tìm thấy đơn đặt hàng', { status: 404 });
    }

    const po = poResult.rows[0];

    // Lấy chi tiết
    const detailsResult = await query(
      `SELECT 
        pod.id,
        COALESCE(pod.item_code, m.material_code) as "itemCode",
        COALESCE(pod.item_name, m.material_name) as "itemName",
        COALESCE(pod.unit, m.unit) as "unit",
        pod.quantity,
        pod.unit_price as "unitPrice",
        pod.total_amount as "totalAmount",
        pod.notes
       FROM purchase_order_details pod
       LEFT JOIN materials m ON m.id = pod.material_id
       WHERE pod.purchase_order_id = $1
       ORDER BY pod.id`,
      [poId]
    );

    const details = detailsResult.rows;

    // Lấy thông tin công ty
    const companyResult = await query(
      `SELECT company_name, tax_code, address, phone, email 
       FROM company_config 
       LIMIT 1`
    );
    const company = companyResult.rows[0] || {};

    const statusMap: any = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'DELIVERED': 'Đã giao hàng',
      'CANCELLED': 'Đã hủy',
    };

    // Tạo HTML cho PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; }
    .title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; text-transform: uppercase; }
    .info-section { margin: 20px 0; }
    .info-row { display: flex; margin-bottom: 8px; font-size: 14px; }
    .info-label { width: 150px; font-weight: bold; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 13px; }
    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .total-section { margin-top: 20px; float: right; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
    .total-row.final { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
    .signature-section { margin-top: 80px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; }
    .signature-title { font-weight: bold; margin-bottom: 60px; }
    .signature-name { font-style: italic; }
    .notes { margin-top: 20px; font-size: 13px; }
    .notes-label { font-weight: bold; margin-bottom: 5px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .status-pending { background-color: #fef3c7; color: #92400e; }
    .status-confirmed { background-color: #dbeafe; color: #1e40af; }
    .status-delivered { background-color: #d1fae5; color: #065f46; }
    .status-cancelled { background-color: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company.company_name || 'CÔNG TY'}</div>
    <div class="company-info">
      ${company.address ? `Địa chỉ: ${company.address}<br>` : ''}
      ${company.phone ? `Điện thoại: ${company.phone}` : ''} ${company.email ? `| Email: ${company.email}` : ''}<br>
      ${company.tax_code ? `MST: ${company.tax_code}` : ''}
    </div>
  </div>

  <div class="title">ĐƠN ĐẶT HÀNG</div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">Mã đơn:</div>
      <div class="info-value"><strong>${po.poCode}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Ngày đặt:</div>
      <div class="info-value">${new Date(po.orderDate).toLocaleDateString('vi-VN')}</div>
    </div>
    ${po.expectedDate ? `
    <div class="info-row">
      <div class="info-label">Ngày dự kiến giao:</div>
      <div class="info-value">${new Date(po.expectedDate).toLocaleDateString('vi-VN')}</div>
    </div>` : ''}
    <div class="info-row">
      <div class="info-label">Trạng thái:</div>
      <div class="info-value">
        <span class="status-badge status-${po.status.toLowerCase()}">${statusMap[po.status] || po.status}</span>
      </div>
    </div>
  </div>

  <div class="info-section">
    <div style="font-weight: bold; margin-bottom: 10px; font-size: 15px;">THÔNG TIN NHÀ CUNG CẤP</div>
    <div class="info-row">
      <div class="info-label">Tên nhà cung cấp:</div>
      <div class="info-value">${po.supplierName}</div>
    </div>
    ${po.supplierPhone ? `
    <div class="info-row">
      <div class="info-label">Điện thoại:</div>
      <div class="info-value">${po.supplierPhone}</div>
    </div>` : ''}
    ${po.supplierAddress ? `
    <div class="info-row">
      <div class="info-label">Địa chỉ:</div>
      <div class="info-value">${po.supplierAddress}</div>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">STT</th>
        <th style="width: 100px;">Mã</th>
        <th>Tên sản phẩm/NVL</th>
        <th style="width: 60px;">ĐVT</th>
        <th style="width: 80px;">Số lượng</th>
        <th style="width: 100px;">Đơn giá</th>
        <th style="width: 120px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((item, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${item.itemCode || '-'}</td>
        <td>${item.itemName}${item.notes ? `<br><small style="color: #666;">${item.notes}</small>` : ''}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${parseFloat(item.quantity).toLocaleString('vi-VN')}</td>
        <td class="text-right">${parseInt(item.unitPrice).toLocaleString('vi-VN')}</td>
        <td class="text-right"><strong>${parseInt(item.totalAmount).toLocaleString('vi-VN')}</strong></td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row final">
      <span>TỔNG TIỀN:</span>
      <span>${parseInt(po.totalAmount).toLocaleString('vi-VN')} đ</span>
    </div>
  </div>

  <div style="clear: both;"></div>

  ${po.notes ? `
  <div class="notes">
    <div class="notes-label">Ghi chú:</div>
    <div>${po.notes}</div>
  </div>` : ''}

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-name">${po.createdBy}</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Nhà cung cấp</div>
      <div class="signature-name">${po.supplierName}</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Người duyệt</div>
      <div class="signature-name">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>

  <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666;">
    In lúc: ${new Date().toLocaleString('vi-VN')}
  </div>

  <script>
    window.onload = function() {
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
