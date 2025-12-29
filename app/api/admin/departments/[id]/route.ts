import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update department
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('admin.users', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền sửa phòng ban'
            }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { departmentName, description } = body;

        if (!departmentName) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Vui lòng nhập tên phòng ban'
            }, { status: 400 });
        }

        const result = await query(
            `UPDATE departments 
       SET department_name = $1, description = $2 
       WHERE id = $3 
       RETURNING *`,
            [departmentName, description, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy phòng ban'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: result.rows[0],
            message: 'Cập nhật phòng ban thành công'
        });

    } catch (error: any) {
        console.error('Update department error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}

// DELETE - Delete department
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { hasPermission, error } = await requirePermission('admin.users', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền xóa phòng ban'
            }, { status: 403 });
        }

        const { id } = await params;

        // Check if department has users
        const checkUsers = await query('SELECT id FROM users WHERE department_id = $1 LIMIT 1', [id]);
        if (checkUsers.rows.length > 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không thể xóa phòng ban đang có nhân viên'
            }, { status: 400 });
        }

        const result = await query(
            'DELETE FROM departments WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Không tìm thấy phòng ban'
            }, { status: 404 });
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Xóa phòng ban thành công'
        });

    } catch (error: any) {
        console.error('Delete department error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}
