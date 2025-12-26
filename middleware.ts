import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Nếu đang ở trang login và đã có token hợp lệ -> redirect về dashboard
  if (pathname.startsWith('/login')) {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        // Token hợp lệ -> redirect về dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        // Token không hợp lệ -> cho phép vào trang login
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // API auth/login luôn cho phép
  if (pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // Public API - xác thực bằng API key, không cần JWT
  if (pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  // Protected routes - kiểm tra token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify JWT token
  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    // Token không hợp lệ hoặc đã hết hạn
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
