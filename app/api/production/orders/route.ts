import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { hasPermission, user: currentUser, error } = await requirePermission('production.orders', 'view');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem đơn sản xuất'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        let sql = `
      SELECT 
        po.id,
        po.order_id as "orderId",
        po.status,
        po.current_step as "currentStep",
        po.start_date as "startDate",
        po.end_date as "endDate",
        o.order_code as "orderCode",
        c.customer_name as "customerName",
        o.order_date as "orderDate",
        po.created_at as "createdAt",
        b.id as "branchId",
        b.branch_name as "branchName"
      FROM production_orders po
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            sql += ` AND po.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            sql += ` AND (o.order_code ILIKE $${paramIndex} OR c.customer_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY po.created_at DESC`;

        const result = await query(sql, params);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get production orders error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { hasPermission, error } = await requirePermission('production.orders', 'create');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền tạo đơn sản xuất'
            }, { status: 403 });
        }

        const body = await request.json();
        const { orderId, sourceWarehouseId, targetWarehouseId } = body;

        if (!orderId) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Thiếu mã đơn hàng'
            }, { status: 400 });
        }

        // Check if exists
        const check = await query('SELECT id FROM production_orders WHERE order_id = $1', [orderId]);
        if (check.rows.length > 0) {
            return NextResponse.json<ApiResponse>({
                success: true,
                data: check.rows[0],
                message: 'Đơn sản xuất đã tồn tại'
            });
        }

        const result = await query(
            `INSERT INTO production_orders (order_id, status, current_step, start_date, source_warehouse_id, target_warehouse_id)
       VALUES ($1, 'MATERIAL_IMPORT', 'MATERIAL_IMPORT', NOW(), $2, $3)
       RETURNING id`,
            [orderId, sourceWarehouseId || null, targetWarehouseId || null]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create production order error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server'
        }, { status: 500 });
    }
}
