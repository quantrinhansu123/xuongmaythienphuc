import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Kiểm tra quyền xem nguyên vật liệu
    const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem nguyên vật liệu'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Data segregation
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (currentUser.roleCode !== 'ADMIN' && currentUser.branchId) {
      whereClause = `WHERE m.branch_id = $${paramIndex}`;
      params.push(currentUser.branchId);
      paramIndex++;
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    const result = await query(
      `SELECT 
        m.id, m.material_code as "materialCode", m.material_name as "materialName",
        m.unit, m.description, m.branch_id as "branchId",
        b.branch_name as "branchName"
       FROM materials m
       LEFT JOIN branches b ON b.id = m.branch_id
       ${whereClause}
       ORDER BY m.id DESC
       LIMIT $${paramIndex}`,
      [...params, limit]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get materials error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền tạo nguyên vật liệu
    const { hasPermission, user: currentUser, error } = await requirePermission('products.materials', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo nguyên vật liệu'
      }, { status: 403 });
    }

    const body = await request.json();
    const { materialCode, materialName, unit, description } = body;

    if (!materialCode || !materialName || !unit) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng điền đầy đủ thông tin'
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO materials (material_code, material_name, unit, description, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, material_code as "materialCode", material_name as "materialName"`,
      [materialCode, materialName, unit, description, currentUser.branchId]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo nguyên vật liệu thành công'
    });

  } catch (error: any) {
    console.error('Create material error:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Mã NVL đã tồn tại'
      }, { status: 400 });
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
