import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission, error } = await requirePermission('purchasing.orders', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem đơn đặt hàng'
      }, { status: 403 });
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
        po.created_at as "createdAt"
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN users u ON u.id = po.created_by
       WHERE po.id = $1`,
      [poId]
    );

    if (poResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Không tìm thấy đơn đặt hàng'
      }, { status: 404 });
    }

    // Lấy chi tiết
    const detailsResult = await query(
      `SELECT 
        pod.id,
        COALESCE(pod.item_code, m.material_code) as "itemCode",
        COALESCE(pod.item_name, m.material_name) as "materialName",
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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...poResult.rows[0],
        details: detailsResult.rows
      }
    });

  } catch (error) {
    console.error('Get purchase order detail error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
