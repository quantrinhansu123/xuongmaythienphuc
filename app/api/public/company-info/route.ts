import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// Public API để lấy thông tin công ty cơ bản cho phiếu in
export async function GET() {
  try {
    const result = await query(
      `SELECT company_name as "companyName", 
              address, 
              phone, 
              logo_url as "logoUrl"
       FROM company_config 
       LIMIT 1`
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0] || {
        companyName: 'CỬA HÀNG',
        address: '',
        phone: '',
        logoUrl: ''
      }
    });

  } catch (error) {
    console.error('Get public company info error:', error);
    return NextResponse.json({
      success: true,
      data: {
        companyName: 'CỬA HÀNG',
        address: '',
        phone: '',
        logoUrl: ''
      }
    });
  }
}
