import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await query(`
      SELECT 
        id, 
        created_at, 
        created_at::text as created_at_text,
        current_setting('TIMEZONE') as db_timezone,
        NOW() as db_now
      FROM inventory_transactions 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        return NextResponse.json({
            success: true,
            info: result.rows,
            serverTime: new Date().toString(),
            serverTimeISO: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
