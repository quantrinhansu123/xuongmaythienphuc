import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// POST - Reset password to default
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check permission - "edit" permission on admin.users is required
        const { hasPermission, error } = await requirePermission('admin.users', 'edit');
        if (!hasPermission) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: error || 'Không có quyền thay đổi mật khẩu'
            }, { status: 403 });
        }

        const { id } = await params;
        // Default password logic. For now getting it from request or hardcode constant?
        // Requirement says: "Mỗi 1 tài khoản mặc định có MK sau đó Admin reset để về MK mặc định"
        // Let's assume a default password like '123456' for now, but ideally this should be in config.
        // However, since we store hash, we need the hash of the default password.
        // Assuming the frontend might send it, OR we handle it here if we use a crypto lib.
        // The current create user endpoint takes raw password and stores it as `password_hash` (temporary implementation noted in code).
        // So we will just set it to '123456' string as per existing simplistic implementation.

        // Default password
        const defaultPassword = '123456';

        await query(
            `UPDATE users 
       SET password_hash = $1, is_default_password = true
       WHERE id = $2`,
            [defaultPassword, id]
        );

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Đã reset mật khẩu về mặc định (1)'
        });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}
