import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Check permission - any logged in user can likely seeing departments, 
        // or restrict to admin using requirePermission('admin.users', 'view') depending on policy.
        // For now, let's keep it open to authenticated users or same as admin users view
        const { hasPermission, error } = await requirePermission('admin.users', 'view');

        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xem phòng ban'
            }, { status: 403 });
        }

        const result = await query(
            `SELECT d.id, d.department_code as "departmentCode", d.department_name as "departmentName", d.description,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id)::int as "userCount"
            FROM departments d 
            ORDER BY d.id ASC`
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows
        });

    } catch (error: any) {
        console.error('Get departments error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}

// POST - Create new department
export async function POST(request: NextRequest) {
    try {
        const { hasPermission, error } = await requirePermission('admin.users', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền tạo phòng ban'
            }, { status: 403 });
        }

        const body = await request.json();
        const { departmentName, description } = body;
        let { departmentCode } = body;

        // Auto-generate code if missing
        if (!departmentCode) {
            // Simple auto-gen logic: PB + timestamp 
            // Or better: PB + random 4 digit. 
            // Let's use PB + random string for simplicity and uniqueness.
            // Or use timestamp to be sort of sequential.
            const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            departmentCode = `PB${suffix}`;
        }

        if (!departmentName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Thiếu thông tin bắt buộc'
            }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO departments (department_code, department_name, description)
            VALUES ($1, $2, $3)
            RETURNING id, department_code as "departmentCode", department_name as "departmentName", description`,
            [departmentCode, departmentName, description]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
            message: 'Tạo phòng ban thành công'
        });

    } catch (error: any) {
        console.error('Create department error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}
