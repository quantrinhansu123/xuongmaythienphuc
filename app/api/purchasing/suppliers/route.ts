import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nhà cung cấp'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    let queryText = `SELECT 
        s.id,
        s.supplier_code as "supplierCode",
        s.supplier_name as "supplierName",
        s.phone,
        s.email,
        s.address,
        sg.group_name as "groupName",
        s.debt_amount as "debtAmount",
        s.is_active as "isActive",
        s.created_at as "createdAt"
       FROM suppliers s
       LEFT JOIN supplier_groups sg ON sg.id = s.supplier_group_id
       WHERE s.branch_id = $1`;

    const params: any[] = [currentUser.branchId];

    if (groupId) {
      queryText += ` AND s.supplier_group_id = $2`;
      params.push(parseInt(groupId));
    }

    queryText += ` ORDER BY s.created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('purchasing.suppliers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nhà cung cấp'
      }, { status: 403 });
    }

    const body = await request.json();
    let { supplierCode, supplierName, phone, email, address, supplierGroupId } = body;

    // Tự động tạo mã nhà cung cấp nếu không có HOẶC kiểm tra trùng
    let finalSupplierCode = supplierCode;

    if (supplierCode) {
      const checkResult = await query(
        'SELECT id FROM suppliers WHERE supplier_code = $1',
        [supplierCode]
      );
      if (checkResult.rows.length > 0) {
        finalSupplierCode = ''; // Trùng thì reset
      }
    }

    if (!finalSupplierCode) {
      if (phone) {
        // Tạo mã từ SĐT: NCC + 6 số cuối
        const cleanPhone = phone.replace(/\s/g, '');
        const last6Digits = cleanPhone.slice(-6);
        const baseCode = `NCC${last6Digits}`;

        // Tìm tất cả mã có dạng NCC654333 hoặc NCC654333_XX
        const existingCodes = await query(
          `SELECT supplier_code FROM suppliers 
           WHERE supplier_code = $1 OR supplier_code LIKE $2
           ORDER BY supplier_code`,
          [baseCode, `${baseCode}_%`]
        );

        if (existingCodes.rows.length === 0) {
          finalSupplierCode = baseCode;
        } else {
          let maxNum = 0;
          for (const row of existingCodes.rows) {
            const code = row.supplier_code;
            if (code === baseCode) {
              maxNum = Math.max(maxNum, 0);
            } else if (code.startsWith(baseCode + '_')) {
              const suffix = code.substring(baseCode.length + 1);
              const num = parseInt(suffix);
              if (!isNaN(num)) {
                maxNum = Math.max(maxNum, num);
              }
            }
          }
          finalSupplierCode = `${baseCode}_${(maxNum + 1).toString().padStart(2, '0')}`;
        }
      } else {
        // Không có SĐT, tạo mã tuần tự
        const codeResult = await query(
          `SELECT 'NCC' || LPAD((COALESCE(MAX(CASE 
             WHEN supplier_code ~ '^NCC[0-9]+$' 
             THEN SUBSTRING(supplier_code FROM 4)::INTEGER 
             ELSE 0 
           END), 0) + 1)::TEXT, 6, '0') as code
           FROM suppliers`
        );
        finalSupplierCode = codeResult.rows[0].code;
      }
    }

    supplierCode = finalSupplierCode;

    const result = await query(
      `INSERT INTO suppliers (
        supplier_code, supplier_name, phone, email, address, 
        supplier_group_id, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        supplierCode,
        supplierName,
        phone || null,
        email || null,
        address || null,
        supplierGroupId || null,
        currentUser.branchId
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
