import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem khách hàng'
      }, { status: 403 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const customerGroupId = searchParams.get('customerGroupId');
    const isActive = searchParams.get('isActive');
    const branchId = searchParams.get('branchId');

    // Data segregation - Admin xem tất cả, user chỉ xem chi nhánh của mình
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Branch filter
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereConditions.push(`c.branch_id = $${paramIndex}`);
      params.push(currentUser.branchId);
      paramIndex++;
    } else if (branchId && branchId !== 'all') {
      whereConditions.push(`c.branch_id = $${paramIndex}`);
      params.push(parseInt(branchId));
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(`(c.customer_name ILIKE $${paramIndex} OR c.customer_code ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Customer group filter
    if (customerGroupId) {
      whereConditions.push(`c.customer_group_id = $${paramIndex}`);
      params.push(parseInt(customerGroupId));
      paramIndex++;
    }

    // Active status filter
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      whereConditions.push(`c.is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const result = await query(
      `SELECT 
        c.id,
        c.customer_code as "customerCode",
        c.customer_name as "customerName",
        c.phone,
        c.email,
        c.address,
        c.customer_group_id as "customerGroupId",
        cg.group_name as "groupName",
        COALESCE(cg.price_multiplier, 0) as "priceMultiplier",
        c.debt_amount as "debtAmount",
        c.is_active as "isActive",
        c.created_at as "createdAt",
        b.branch_name as "branchName"
       FROM customers c
       LEFT JOIN customer_groups cg ON cg.id = c.customer_group_id
       LEFT JOIN branches b ON b.id = c.branch_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasPermission, user: currentUser, error } = await requirePermission('sales.customers', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo khách hàng'
      }, { status: 403 });
    }

    const body = await request.json();
    let { customerCode, customerName, phone, email, address, customerGroupId } = body;

    // Validate số điện thoại nếu có
    if (phone) {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      const cleanPhone = phone.replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Số điện thoại không hợp lệ (phải là 10-11 số, bắt đầu bằng 0 hoặc +84)'
        }, { status: 400 });
      }
      phone = cleanPhone; // Lưu số điện thoại đã clean
    }

    // Tự động tạo mã khách hàng nếu không có
    if (!customerCode) {
      if (phone) {
        // Tạo mã dựa trên số điện thoại: KH + 6 số cuối
        const last6Digits = phone.slice(-6);
        customerCode = `KH${last6Digits}`;
        
        // Kiểm tra trùng, nếu trùng thì thêm số thứ tự
        const checkResult = await query(
          'SELECT customer_code FROM customers WHERE customer_code LIKE $1 ORDER BY customer_code DESC LIMIT 1',
          [`${customerCode}%`]
        );
        
        if (checkResult.rows.length > 0) {
          const existingCode = checkResult.rows[0].customer_code;
          // Nếu trùng, thêm số thứ tự (KH123456_01, KH123456_02, ...)
          const match = existingCode.match(/_(\d+)$/);
          const nextNum = match ? parseInt(match[1]) + 1 : 1;
          customerCode = `${customerCode}_${nextNum.toString().padStart(2, '0')}`;
        }
      } else {
        // Không có SĐT, tạo mã tuần tự
        const codeResult = await query(
          `SELECT 'KH' || LPAD((COALESCE(MAX(CASE 
             WHEN customer_code ~ '^KH[0-9]+$' 
             THEN SUBSTRING(customer_code FROM 3)::INTEGER 
             ELSE 0 
           END), 0) + 1)::TEXT, 6, '0') as code
           FROM customers`
        );
        customerCode = codeResult.rows[0].code;
      }
    } else {
      // Kiểm tra mã khách hàng trùng nếu có customerCode
      const checkResult = await query(
        'SELECT id FROM customers WHERE customer_code = $1',
        [customerCode]
      );

      if (checkResult.rows.length > 0) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Mã khách hàng đã tồn tại'
        }, { status: 400 });
      }
    }

    const result = await query(
      `INSERT INTO customers (
        customer_code, customer_name, phone, email, address, 
        customer_group_id, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        customer_code as "customerCode",
        customer_name as "customerName",
        phone,
        email,
        address,
        customer_group_id as "customerGroupId",
        0 as "priceMultiplier"`,
      [
        customerCode,
        customerName,
        phone || null,
        email || null,
        address || null,
        customerGroupId || null,
        currentUser.branchId
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
