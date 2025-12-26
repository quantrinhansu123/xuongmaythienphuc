import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_EXPIRY_HOURS = 24; // Token hết hạn sau 24h

export interface UserPayload {
  id: number;
  username: string;
  fullName: string;
  branchId: number;
  roleId: number;
  roleCode: string;
  sessionToken?: string; // Token phiên đăng nhập
}

// Tạo session token duy nhất
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateToken = (user: UserPayload): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_HOURS}h` });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
};

export const setAuthCookie = async (token: string) => {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * SESSION_EXPIRY_HOURS, // 24 hours
    path: '/',
  });
};

export const getAuthCookie = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
};

export const removeAuthCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
};

export const getCurrentUser = async (): Promise<UserPayload | null> => {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
};

// Tính thời gian hết hạn session
export const getSessionExpiryTime = (): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_EXPIRY_HOURS);
  return expiry;
};
