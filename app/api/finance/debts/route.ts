import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';

// GET - Lấy danh sách công nợ
export async function GET(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'view');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const debtType = searchParams.get('debtType'); // RECEIVABLE (Phải thu), PAYABLE (Phải trả)
    const status = searchParams.get('status'); // PENDING, PARTIAL, PAID, OVERDUE
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');

    let sql = `
      SELECT 
        dm.id,
        dm.debt_code as "debtCode",
        dm.debt_type as "debtType",
        dm.original_amount as "originalAmount",

        dm.paid_amount as "paidAmount",
        dm.remaining_amount as "remainingAmount",
        dm.due_date as "dueDate",
        dm.status,
        dm.reference_type as "referenceType",
        dm.reference_id as "referenceId",
        dm.notes,
        c.customer_name as "customerName",
        c.customer_code as "customerCode",
        c.phone as "customerPhone",
        s.supplier_name as "supplierName",
        s.supplier_code as "supplierCode",
        s.phone as "supplierPhone",
        dm.created_at as "createdAt",
        dm.updated_at as "updatedAt"
      FROM debt_management dm
      LEFT JOIN customers c ON c.id = dm.customer_id
      LEFT JOIN suppliers s ON s.id = dm.supplier_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (debtType) {
      sql += ` AND dm.debt_type = $${paramCount}`;
      params.push(debtType);
      paramCount++;
    }

    if (status) {
      sql += ` AND dm.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customerId) {
      sql += ` AND dm.customer_id = $${paramCount}`;
      params.push(customerId);
      paramCount++;
    }

    if (supplierId) {
      sql += ` AND dm.supplier_id = $${paramCount}`;
      params.push(supplierId);
      paramCount++;
    }

    sql += ` ORDER BY dm.due_date ASC, dm.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Tạo công nợ mới
export async function POST(request: NextRequest) {
  const { hasPermission, user, error } = await requirePermission('finance.debts', 'create');
  
  if (!hasPermission) {
    return NextResponse.json({ success: false, error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      debtCode,
      customerId,
      supplierId,
      debtType,
      originalAmount,
      dueDate,
      referenceId,
      referenceType,
      notes,
    } = body;

    // Validate
    if (!debtCode || !debtType || !originalAmount) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['RECEIVABLE', 'PAYABLE'].includes(debtType)) {
      return NextResponse.json(
        { success: false, error: 'Loại công nợ không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra phải có customer hoặc supplier
    if (debtType === 'RECEIVABLE' && !customerId) {
      return NextResponse.json(
        { success: false, error: 'Công nợ phải thu phải có khách hàng' },
        { status: 400 }
      );
    }

    if (debtType === 'PAYABLE' && !supplierId) {
      return NextResponse.json(
        { success: false, error: 'Công nợ phải trả phải có nhà cung cấp' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO debt_management 
        (debt_code, customer_id, supplier_id, debt_type, original_amount, 
         remaining_amount, due_date, reference_id, reference_type, notes)
      VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        debt_code as "debtCode",
        debt_type as "debtType",
        original_amount as "originalAmount",
        remaining_amount as "remainingAmount",
        due_date as "dueDate",
        status,
        created_at as "createdAt"`,
      [
        debtCode,
        customerId || null,
        supplierId || null,
        debtType,
        originalAmount,
        dueDate || null,
        referenceId || null,
        referenceType || null,
        notes,
      ]
    );

    // Cập nhật debt_amount của customer hoặc supplier
    if (customerId) {
      await query(
        `UPDATE customers SET debt_amount = debt_amount + $1 WHERE id = $2`,
        [originalAmount, customerId]
      );
    }

    if (supplierId) {
      await query(
        `UPDATE suppliers SET debt_amount = debt_amount + $1 WHERE id = $2`,
        [originalAmount, supplierId]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating debt:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Mã công nợ đã tồn tại' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
