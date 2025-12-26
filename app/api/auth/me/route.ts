import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
