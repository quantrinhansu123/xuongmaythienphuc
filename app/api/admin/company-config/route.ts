import { query } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Kiểm tra quyền - chỉ admin mới được xem
    const { hasPermission, error } = await requirePermission('admin.branches', 'view');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền xem thông tin công ty'
      }, { status: 403 });
    }

    const result = await query(
      `SELECT id, company_name as "companyName", tax_code as "taxCode", 
              address, phone, email, header_text as "headerText", 
              footer_text as "footerText", logo_url as "logoUrl",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM company_config 
       LIMIT 1`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0] || null
    });

  } catch (error) {
    console.error('Get company config error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Kiểm tra quyền - chỉ admin mới được sửa
    const { hasPermission, error } = await requirePermission('admin.branches', 'edit');
    if (!hasPermission) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error || 'Không có quyền chỉnh sửa thông tin công ty'
      }, { status: 403 });
    }

    const body = await request.json();
    const { companyName, taxCode, address, phone, email, headerText, footerText, logoUrl } = body;

    if (!companyName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Tên công ty không được để trống'
      }, { status: 400 });
    }

    // Check if config exists
    const existing = await query('SELECT id FROM company_config LIMIT 1');
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await query(
        `UPDATE company_config 
         SET company_name = $1, tax_code = $2, address = $3, phone = $4, 
             email = $5, header_text = $6, footer_text = $7, logo_url = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING id, company_name as "companyName", tax_code as "taxCode"`,
        [companyName, taxCode, address, phone, email, headerText, footerText, logoUrl, existing.rows[0].id]
      );
    } else {
      // Insert new
      result = await query(
        `INSERT INTO company_config (company_name, tax_code, address, phone, email, header_text, footer_text, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, company_name as "companyName", tax_code as "taxCode"`,
        [companyName, taxCode, address, phone, email, headerText, footerText, logoUrl]
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thông tin công ty thành công'
    });

  } catch (error) {
    console.error('Update company config error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Lỗi server'
    }, { status: 500 });
  }
}
