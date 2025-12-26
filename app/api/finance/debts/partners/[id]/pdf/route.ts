import { query } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission } = await requirePermission("finance.debts", "view");
    if (!hasPermission) {
      return new NextResponse("Không có quyền xem phiếu công nợ", { status: 403 });
    }

    const resolvedParams = await params;
    const partnerId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const partnerType = searchParams.get("type") as "customer" | "supplier";

    if (!partnerType) {
      return new NextResponse("Thiếu thông tin loại đối tác", { status: 400 });
    }

    // Lấy thông tin đối tác
    const tableName = partnerType === "customer" ? "customers" : "suppliers";
    const nameField = partnerType === "customer" ? "customer_name" : "supplier_name";
    const codeField = partnerType === "customer" ? "customer_code" : "supplier_code";

    const partnerResult = await query(
      `SELECT ${nameField} as name, ${codeField} as code, phone, email, address
       FROM ${tableName} WHERE id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return new NextResponse("Không tìm thấy đối tác", { status: 404 });
    }

    const partner = partnerResult.rows[0];

    // Lấy danh sách đơn hàng
    let ordersResult;
    if (partnerType === "customer") {
      ordersResult = await query(
        `SELECT o.order_code as "orderCode", o.order_date as "orderDate",
          o.final_amount as "finalAmount",
          COALESCE(o.deposit_amount, 0) as "depositAmount",
          COALESCE(o.paid_amount, 0) as "paidAmount",
          o.final_amount - COALESCE(o.deposit_amount, 0) - COALESCE(o.paid_amount, 0) as "remainingAmount",
          o.payment_status as "paymentStatus"
         FROM orders o WHERE o.customer_id = $1 AND o.status != 'CANCELLED'
         ORDER BY o.order_date DESC`,
        [partnerId]
      );
    } else {
      ordersResult = await query(
        `SELECT po.po_code as "orderCode", po.order_date as "orderDate",
          po.total_amount as "finalAmount", 0 as "depositAmount",
          COALESCE(po.paid_amount, 0) as "paidAmount",
          po.total_amount - COALESCE(po.paid_amount, 0) as "remainingAmount",
          po.payment_status as "paymentStatus"
         FROM purchase_orders po WHERE po.supplier_id = $1 AND po.status != 'CANCELLED'
         ORDER BY po.order_date DESC`,
        [partnerId]
      );
    }

    const orders = ordersResult.rows;
    const totalAmount = orders.reduce((sum: number, o: any) => sum + parseFloat(o.finalAmount || 0), 0);
    const totalPaid = orders.reduce((sum: number, o: any) => sum + parseFloat(o.depositAmount || 0) + parseFloat(o.paidAmount || 0), 0);
    const totalRemaining = orders.reduce((sum: number, o: any) => sum + parseFloat(o.remainingAmount || 0), 0);

    // Lấy thông tin công ty
    const companyResult = await query(`SELECT company_name, tax_code, address, phone FROM company_config LIMIT 1`);
    const company = companyResult.rows[0] || {};

    const isCustomer = partnerType === "customer";
    const title = isCustomer ? "BẢNG KÊ CÔNG NỢ KHÁCH HÀNG" : "BẢNG KÊ CÔNG NỢ NHÀ CUNG CẤP";
    const partnerLabel = isCustomer ? "Khách hàng" : "Nhà cung cấp";

    const statusMap: Record<string, string> = { UNPAID: "Chưa TT", PARTIAL: "Một phần", PAID: "Đã TT" };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 20px 30px; font-size: 13px; color: #000; }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px; }
    .company-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
    .company-info { font-size: 11px; margin-top: 3px; }
    .title { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0 5px; text-transform: uppercase; }
    .print-date { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 15px; }
    .info-section { margin-bottom: 15px; }
    .info-row { display: flex; margin-bottom: 5px; font-size: 13px; }
    .info-label { width: 120px; }
    .info-value { flex: 1; font-weight: 500; }
    .summary { display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px 15px; margin-bottom: 15px; }
    .summary-item { text-align: center; }
    .summary-label { font-size: 11px; }
    .summary-value { font-size: 15px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
    th, td { border: 1px solid #000; padding: 6px 8px; }
    th { background: #f0f0f0; font-weight: bold; text-align: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .total-row { background: #f0f0f0; font-weight: bold; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
    .signature-box { text-align: center; width: 150px; }
    .signature-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; }
    .signature-subtitle { font-size: 10px; font-style: italic; margin-bottom: 60px; }
    .footer { margin-top: 20px; text-align: right; font-size: 10px; font-style: italic; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { body { padding: 10px 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company.company_name || "CÔNG TY"}</div>
    <div class="company-info">
      ${company.address || ""} ${company.phone ? `- ĐT: ${company.phone}` : ""} ${company.tax_code ? `- MST: ${company.tax_code}` : ""}
    </div>
  </div>

  <div class="title">${title}</div>
  <div class="print-date">Ngày in: ${new Date().toLocaleDateString("vi-VN")}</div>

  <div class="info-section">
    <div class="info-row"><div class="info-label">${partnerLabel}:</div><div class="info-value">${partner.name} (${partner.code})</div></div>
    <div class="info-row"><div class="info-label">Điện thoại:</div><div class="info-value">${partner.phone || "-"}</div></div>
    <div class="info-row"><div class="info-label">Địa chỉ:</div><div class="info-value">${partner.address || "-"}</div></div>
  </div>

  <div class="summary">
    <div class="summary-item"><div class="summary-label">Tổng giá trị</div><div class="summary-value">${totalAmount.toLocaleString("vi-VN")} đ</div></div>
    <div class="summary-item"><div class="summary-label">Đã thanh toán</div><div class="summary-value">${totalPaid.toLocaleString("vi-VN")} đ</div></div>
    <div class="summary-item"><div class="summary-label">Còn nợ</div><div class="summary-value">${totalRemaining.toLocaleString("vi-VN")} đ</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:30px">STT</th>
        <th style="width:100px">Mã đơn</th>
        <th style="width:80px">Ngày</th>
        <th class="text-right" style="width:100px">Tổng tiền</th>
        <th class="text-right" style="width:100px">Đã trả</th>
        <th class="text-right" style="width:100px">Còn nợ</th>
        <th style="width:70px">Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o: any, i: number) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${o.orderCode}</td>
          <td class="text-center">${new Date(o.orderDate).toLocaleDateString("vi-VN")}</td>
          <td class="text-right">${parseFloat(o.finalAmount).toLocaleString("vi-VN")}</td>
          <td class="text-right">${(parseFloat(o.depositAmount || 0) + parseFloat(o.paidAmount || 0)).toLocaleString("vi-VN")}</td>
          <td class="text-right ${parseFloat(o.remainingAmount) > 0 ? "font-bold" : ""}">${parseFloat(o.remainingAmount).toLocaleString("vi-VN")}</td>
          <td class="text-center">${statusMap[o.paymentStatus] || o.paymentStatus}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="3" class="text-right">Tổng cộng:</td>
        <td class="text-right">${totalAmount.toLocaleString("vi-VN")}</td>
        <td class="text-right">${totalPaid.toLocaleString("vi-VN")}</td>
        <td class="text-right">${totalRemaining.toLocaleString("vi-VN")}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-section">
    <div class="signature-box"><div class="signature-title">Người lập</div><div class="signature-subtitle">(Ký, ghi rõ họ tên)</div></div>
    <div class="signature-box"><div class="signature-title">Kế toán</div><div class="signature-subtitle">(Ký, ghi rõ họ tên)</div></div>
    <div class="signature-box"><div class="signature-title">${partnerLabel}</div><div class="signature-subtitle">(Ký, ghi rõ họ tên)</div></div>
  </div>

  <div class="footer">In lúc: ${new Date().toLocaleString("vi-VN")}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return new NextResponse("Lỗi server", { status: 500 });
  }
}
