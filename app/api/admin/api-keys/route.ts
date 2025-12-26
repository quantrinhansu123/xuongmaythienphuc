import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Tạo API key ngẫu nhiên
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// GET: Lấy danh sách API keys
export async function GET() {
  try {
    const { hasPermission, error } = await requirePermission('admin.api-keys', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        ak.id,
        ak.key_name as "keyName",
        ak.api_key as "apiKey",
        ak.description,
        ak.is_active as "isActive",
        ak.permissions,
        ak.rate_limit as "rateLimit",
        ak.last_used_at as "lastUsedAt",
        ak.expires_at as "expiresAt",
        ak.created_at as "createdAt",
        u.full_name as "createdByName"
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.created_by
      ORDER BY ak.created_at DESC`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { apiKeys: result.rows }
    });

  } catch (error: any) {
    if (error?.code === '42P01') {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { apiKeys: [], needMigration: true }
      });
    }
    console.error('Get API keys error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

// POST: Tạo API key mới
export async function POST(request: NextRequest) {
  try {
    const { hasPermission, error } = await requirePermission('admin.api-keys', 'create');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền tạo'
      }, { status: 403 });
    }

    const user = await getCurrentUser();
    const { keyName, description, permissions, rateLimit, expiresAt } = await request.json();

    if (!keyName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Vui lòng nhập tên API key'
      }, { status: 400 });
    }

    const apiKey = generateApiKey();

    const result = await query(
      `INSERT INTO api_keys (key_name, api_key, description, permissions, rate_limit, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, key_name as "keyName", api_key as "apiKey", created_at as "createdAt"`,
      [
        keyName,
        apiKey,
        description || null,
        JSON.stringify(permissions || ['login', 'users']),
        rateLimit || 1000,
        expiresAt || null,
        user?.id
      ]
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Tạo API key thành công'
    });

  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
