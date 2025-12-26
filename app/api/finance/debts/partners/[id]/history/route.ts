import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

// GET - Lấy lịch sử thanh toán của khách hàng/nhà cung cấp
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission, error } = await requirePermission('finance.debts', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const partnerType = searchParams.get('type') || 'customer';

  try {
    let result;
    
    if (partnerType === 'customer') {
      // Lấy lịch sử thanh toán từ order_payments cho khách hàng
      result = await query(
        `SELECT 
          op.id,
          op.amount as "paymentAmount",
          op.created_at as "paymentDate",
          op.payment_type as "paymentType",
          op.payment_method as "paymentMethod",
          op.notes,
          ba.account_number as "bankAccountNumber",
          ba.bank_name as "bankName",
          COALESCE(ba.account_type, 'BANK') as "accountType",
          u.full_name as "createdByName",
          op.created_at as "createdAt",
          o.id as "orderId",
          o.order_code as "orderCode"
        FROM order_payments op
        JOIN orders o ON o.id = op.order_id
        LEFT JOIN bank_accounts ba ON ba.id = op.bank_account_id
        LEFT JOIN users u ON u.id = op.created_by
        WHERE o.customer_id = $1
        ORDER BY op.created_at DESC
        LIMIT 50`,
        [id]
      );
    } else {
      // Lấy lịch sử thanh toán từ debt_payments cho nhà cung cấp
      result = await query(
        `SELECT 
          dp.id,
          dp.payment_amount as "paymentAmount",
          dp.payment_date as "paymentDate",
          dp.payment_method as "paymentMethod",
          dp.notes,
          ba.account_number as "bankAccountNumber",
          ba.bank_name as "bankName",
          COALESCE(ba.account_type, 'BANK') as "accountType",
          u.full_name as "createdByName",
          dp.created_at as "createdAt",
          dm.reference_id as "orderId",
          po.po_code as "orderCode"
        FROM debt_payments dp
        JOIN debt_management dm ON dm.id = dp.debt_id
        LEFT JOIN purchase_orders po ON po.id = dm.reference_id AND dm.reference_type = 'PURCHASE'
        LEFT JOIN bank_accounts ba ON ba.id = dp.bank_account_id
        LEFT JOIN users u ON u.id = dp.created_by
        WHERE dm.supplier_id = $1
        ORDER BY dp.created_at DESC
        LIMIT 50`,
        [id]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching partner payment history:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
