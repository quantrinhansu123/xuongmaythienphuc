import { query } from './db';

interface ApiKeyInfo {
  id: number;
  keyName: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; keyInfo?: ApiKeyInfo }> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    const result = await query(
      `SELECT id, key_name as "keyName", permissions, rate_limit as "rateLimit", 
              is_active as "isActive", expires_at as "expiresAt"
       FROM api_keys WHERE api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }

    const keyInfo = result.rows[0] as ApiKeyInfo;

    // Kiểm tra trạng thái
    if (!keyInfo.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }

    // Kiểm tra hết hạn
    if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Cập nhật last_used_at
    await query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [keyInfo.id]
    );

    return { valid: true, keyInfo };

  } catch (error: any) {
    // Bảng chưa tồn tại - fallback về env
    if (error?.code === '42P01') {
      const envKey = process.env.PUBLIC_API_KEY;
      if (envKey && apiKey === envKey) {
        return { 
          valid: true, 
          keyInfo: {
            id: 0,
            keyName: 'ENV_KEY',
            permissions: ['login', 'users'],
            rateLimit: 1000,
            isActive: true,
            expiresAt: null
          }
        };
      }
      return { valid: false, error: 'Invalid API key' };
    }
    throw error;
  }
}

export function hasPermission(keyInfo: ApiKeyInfo, permission: string): boolean {
  return keyInfo.permissions.includes(permission);
}
