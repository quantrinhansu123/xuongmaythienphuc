import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem warehouses
    const { hasPermission, user: currentUser, error } = await requirePermission('admin.warehouses', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem kho'
      }, { status: 403 });
    }

    // Data segregation
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    let paramIndex = 1;

    if (currentUser.roleCode !== 'ADMIN') {
      whereClause += ` AND w.branch_id = $${paramIndex}`;
      params.push(currentUser.branchId);
      paramIndex++;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (type) {
      whereClause += ` AND w.warehouse_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        w.id, w.warehouse_code as "warehouseCode", w.warehouse_name as "warehouseName",
        w.branch_id as "branchId", w.address, w.is_active as "isActive",
        w.warehouse_type as "warehouseType",
        b.branch_name as "branchName"
       FROM warehouses w
       LEFT JOIN branches b ON b.id = w.branch_id
       ${whereClause}
       ORDER BY w.id`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get warehouses error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo warehouse
    const { hasPermission, error } = await requirePermission('admin.warehouses', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo kho'
      }, { status: 403 });
    }

    const body = await request.json();
    let { warehouseCode, warehouseName, branchId, address, warehouseType } = body;

    if (!warehouseName || !branchId || !warehouseType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    // Tự sinh mã kho nếu không có
    if (!warehouseCode) {
      const codeResult = await query(
        `SELECT 'KHO' || LPAD((COALESCE(MAX(CASE 
           WHEN warehouse_code ~ '^KHO[0-9]+$' 
           THEN SUBSTRING(warehouse_code FROM 4)::INTEGER 
           ELSE 0 
         END), 0) + 1)::TEXT, 3, '0') as code
         FROM warehouses`
      );
      warehouseCode = codeResult.rows[0].code;
    }

    const result = await query(
      `INSERT INTO warehouses (warehouse_code, warehouse_name, branch_id, address, warehouse_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, warehouse_code as "warehouseCode", warehouse_name as "warehouseName", warehouse_type as "warehouseType"`,
      [warehouseCode, warehouseName, branchId, address, warehouseType]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo kho thành công'
    });

  } catch (error: any) {
    console.error('Create warehouse error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã kho đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
