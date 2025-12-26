import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// Format số theo kiểu Việt Nam (dấu chấm phân cách hàng nghìn)
function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  const rounded = Math.round(n);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission } = await requirePermission('sales.orders', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền xem đơn hàng', { status: 403 });
    }

    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    // Lấy thông tin đơn hàng
    const orderResult = await query(
      `SELECT 
        o.id,
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        c.phone as "customerPhone",
        c.address as "customerAddress",
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.discount_amount as "discountAmount",
        o.final_amount as "finalAmount",
        o.status,
        o.notes,
        u.full_name as "createdBy",
        o.created_at as "createdAt",
        b.branch_name as "branchName",
        b.address as "branchAddress",
        b.phone as "branchPhone"
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN users u ON u.id = o.created_by
       LEFT JOIN branches b ON b.id = o.branch_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return new NextResponse('Không tìm thấy đơn hàng', { status: 404 });
    }

    const order = orderResult.rows[0];

    // Lấy chi tiết hàng hóa (items)
    const detailsResult = await query(
      `SELECT 
        od.id,
        COALESCE(i.item_code, p.product_code) as "itemCode",
        COALESCE(i.item_name, p.product_name) as "itemName",
        COALESCE(i.unit, p.unit) as unit,
        od.quantity,
        od.unit_price as "unitPrice",
        od.total_amount as "totalAmount",
        od.notes
       FROM order_details od
       LEFT JOIN items i ON i.id = od.item_id
       LEFT JOIN products p ON p.id = od.product_id
       WHERE od.order_id = $1
       ORDER BY od.id`,
      [orderId]
    );

    const details = detailsResult.rows;

    // Lấy thông số (measurements) cho từng item
    const measurementsByDetail: any = {};
    if (details.length > 0) {
      const detailIds = details.map(d => d.id);
      const measurementsResult = await query(
        `SELECT 
          oim.order_detail_id as "orderDetailId",
          ca.attribute_name as "attributeName",
          oim.value
         FROM order_item_measurements oim
         JOIN category_attributes ca ON ca.id = oim.attribute_id
         WHERE oim.order_detail_id = ANY($1)
         ORDER BY oim.order_detail_id, ca.id`,
        [detailIds]
      );

      // Group measurements by order_detail_id
      measurementsResult.rows.forEach((m: any) => {
        if (!measurementsByDetail[m.orderDetailId]) {
          measurementsByDetail[m.orderDetailId] = [];
        }
        measurementsByDetail[m.orderDetailId].push(m);
      });
    }

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
      'PAID': 'Đã thanh toán',
      'MEASUREMENTS_COMPLETED': 'Đã nhập thông số',
      'WAITING_MATERIAL': 'Chờ nguyên liệu',
      'IN_PRODUCTION': 'Đang sản xuất',
      'COMPLETED': 'Hoàn thành',
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
    .status-completed { background-color: #d1fae5; color: #065f46; }
    .status-cancelled { background-color: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
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

  <div class="title">ĐơN HÀNG</div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">Mã đơn hàng:</div>
      <div class="info-value"><strong>${order.orderCode}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Ngày đặt:</div>
      <div class="info-value">${new Date(order.orderDate).toLocaleDateString('vi-VN')}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Trạng thái:</div>
      <div class="info-value">
        <span class="status-badge status-${order.status.toLowerCase()}">${statusMap[order.status] || order.status}</span>
      </div>
    </div>
  </div>

  <div class="info-section">
    <div style="font-weight: bold; margin-bottom: 10px; font-size: 15px;">THÔNG TIN KHÁCH HÀNG</div>
    <div class="info-row">
      <div class="info-label">Tên khách hàng:</div>
      <div class="info-value">${order.customerName}</div>
    </div>
    ${order.customerPhone ? `
    <div class="info-row">
      <div class="info-label">Điện thoại:</div>
      <div class="info-value">${order.customerPhone}</div>
    </div>` : ''}
    ${order.customerAddress ? `
    <div class="info-row">
      <div class="info-label">Địa chỉ:</div>
      <div class="info-value">${order.customerAddress}</div>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">STT</th>
        <th style="width: 100px;">Mã HH</th>
        <th>Tên hàng hóa</th>
        <th style="width: 60px;">ĐVT</th>
        <th style="width: 80px;">Số lượng</th>
        <th style="width: 100px;">Đơn giá</th>
        <th style="width: 120px;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${details.map((item, idx) => {
        const measurements = measurementsByDetail[item.id] || [];
        const measurementsHtml = measurements.length > 0 
          ? `<br><small style="color: #0066cc; font-weight: bold;">📏 Thông số: ${measurements.map((m: any) => `${m.attributeName}: ${m.value}`).join(', ')}</small>`
          : '';
        return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${item.itemCode}</td>
        <td>${item.itemName}${measurementsHtml}${item.notes ? `<br><small style="color: #666;">💬 ${item.notes}</small>` : ''}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatNumber(item.quantity)}</td>
        <td class="text-right">${formatNumber(item.unitPrice)}</td>
        <td class="text-right"><strong>${formatNumber(item.totalAmount)}</strong></td>
      </tr>
      `;
      }).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">
      <span>Tổng tiền:</span>
      <span>${formatNumber(order.totalAmount)} đ</span>
    </div>
    ${order.discountAmount > 0 ? `
    <div class="total-row" style="color: #dc2626;">
      <span>Giảm giá:</span>
      <span>-${formatNumber(order.discountAmount)} đ</span>
    </div>` : ''}
    <div class="total-row final">
      <span>THÀNH TIỀN:</span>
      <span>${formatNumber(order.finalAmount)} đ</span>
    </div>
  </div>

  <div style="clear: both;"></div>

  ${order.notes ? `
  <div class="notes">
    <div class="notes-label">Ghi chú:</div>
    <div>${order.notes}</div>
  </div>` : ''}

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-name">${order.createdBy}</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Khách hàng</div>
      <div class="signature-name">${order.customerName}</div>
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
