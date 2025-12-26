import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';
import { ApiResponse } from '@/types';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chưa đăng nhập'
      }, { status: 401 });
    }

    // ADMIN có toàn quyền - trả về tất cả permissions với full quyền
    if (user.roleCode === 'ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          isAdmin: true,
          permissions: [] // Frontend sẽ hiểu ADMIN có toàn quyền
        }
      });
    }

    const permissions = await getUserPermissions(user.roleId);

    console.log(`[Auth Permissions] User: ${user.username}, Role: ${user.roleCode}, RoleID: ${user.roleId}`);
    console.log(`[Auth Permissions] Loaded ${permissions.length} permissions:`, permissions.map(p => p.permissionCode));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        isAdmin: false,
        permissions
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
