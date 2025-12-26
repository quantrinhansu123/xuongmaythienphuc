import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponse } from '@/types';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.roleCode !== 'ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Chỉ ADMIN mới có quyền seed permissions'
      }, { status: 403 });
    }

    // Xóa dữ liệu cũ
    await query('TRUNCATE TABLE role_permissions CASCADE');
    await query('TRUNCATE TABLE permissions RESTART IDENTITY CASCADE');

    // Insert permissions
    const permissionsData = [
      ['admin.users', 'Quản lý người dùng', 'admin', 'Xem, thêm, sửa, xóa người dùng'],
      ['admin.roles', 'Quản lý vai trò', 'admin', 'Xem, thêm, sửa, xóa vai trò'],
      ['admin.branches', 'Quản lý chi nhánh', 'admin', 'Xem, thêm, sửa, xóa chi nhánh'],
      ['admin.warehouses', 'Quản lý kho', 'admin', 'Xem, thêm, sửa, xóa kho'],
      ['products.categories', 'Quản lý danh mục SP', 'products', 'Xem, thêm, sửa, xóa danh mục'],
      ['products.products', 'Quản lý sản phẩm', 'products', 'Xem, thêm, sửa, xóa sản phẩm'],
      ['products.materials', 'Quản lý NVL', 'products', 'Xem, thêm, sửa, xóa nguyên vật liệu'],
      ['products.bom', 'Quản lý định mức', 'products', 'Xem, thêm, sửa, xóa BOM'],
      ['inventory.import', 'Nhập kho', 'inventory', 'Xem, tạo, duyệt phiếu nhập'],
      ['inventory.export', 'Xuất kho', 'inventory', 'Xem, tạo, duyệt phiếu xuất'],
      ['inventory.transfer', 'Chuyển kho', 'inventory', 'Xem, tạo, duyệt phiếu chuyển'],
      ['inventory.balance', 'Xem tồn kho', 'inventory', 'Xem báo cáo tồn kho'],
      ['sales.customers', 'Quản lý khách hàng', 'sales', 'Xem, thêm, sửa, xóa khách hàng'],
      ['sales.orders', 'Quản lý đơn hàng', 'sales', 'Xem, tạo, sửa, xóa đơn hàng'],
      ['sales.reports', 'Báo cáo bán hàng', 'sales', 'Xem báo cáo bán hàng'],
      ['purchasing.suppliers', 'Quản lý NCC', 'purchasing', 'Xem, thêm, sửa, xóa nhà cung cấp'],
      ['purchasing.orders', 'Quản lý đơn mua', 'purchasing', 'Xem, tạo, sửa, xóa đơn mua'],
      ['finance.cashbooks', 'Quản lý sổ quỹ', 'finance', 'Xem, thêm, sửa, xóa sổ quỹ'],
      ['finance.debts', 'Quản lý công nợ', 'finance', 'Xem, thêm, thanh toán công nợ'],
      ['finance.reports', 'Báo cáo tài chính', 'finance', 'Xem báo cáo tài chính'],
    ];

    for (const [code, name, module, desc] of permissionsData) {
      await query(
        'INSERT INTO permissions (permission_code, permission_name, module, description) VALUES ($1, $2, $3, $4)',
        [code, name, module, desc]
      );
    }

    // Lấy role IDs
    const rolesResult = await query('SELECT id, role_code FROM roles WHERE role_code IN ($1, $2, $3)', ['ADMIN', 'MANAGER', 'STAFF']);
    const rolesMap = rolesResult.rows.reduce((acc: any, row: any) => {
      acc[row.role_code] = row.id;
      return acc;
    }, {});

    // ADMIN KHÔNG CẦN PHÂN QUYỀN TRONG DATABASE
    // ADMIN có toàn quyền tự động thông qua logic trong requirePermission()
    console.log('⚠️ ADMIN không cần phân quyền trong database - có toàn quyền tự động');

    // Phân quyền MANAGER - trừ admin.users và admin.roles
    const managerPerms = await query(
      "SELECT id FROM permissions WHERE permission_code NOT IN ('admin.users', 'admin.roles')"
    );
    for (const perm of managerPerms.rows) {
      await query(
        'INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
        [rolesMap.MANAGER, perm.id, true, true, true, true]
      );
    }

    // Phân quyền STAFF - giới hạn
    const staffPerms = [
      { code: 'products.products', view: true, create: false, edit: false, del: false },
      { code: 'sales.customers', view: true, create: true, edit: false, del: false },
      { code: 'sales.orders', view: true, create: true, edit: true, del: false },
      { code: 'inventory.balance', view: true, create: false, edit: false, del: false },
    ];

    for (const sp of staffPerms) {
      const permResult = await query('SELECT id FROM permissions WHERE permission_code = $1', [sp.code]);
      if (permResult.rows.length > 0) {
        await query(
          'INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
          [rolesMap.STAFF, permResult.rows[0].id, sp.view, sp.create, sp.edit, sp.del]
        );
      }
    }

    // Đếm kết quả
    const counts = await query(`
      SELECT 
        (SELECT COUNT(*) FROM permissions) as permissions_count,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = $1) as manager_count,
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = $2) as staff_count
    `, [rolesMap.MANAGER, rolesMap.STAFF]);
    
    // Thêm thông tin ADMIN
    counts.rows[0].admin_count = 'ALL (Toàn quyền tự động)';

    return NextResponse.json<ApiResponse>({
      success: true,
      data: counts.rows[0],
      message: 'Seed permissions thành công'
    });

  } catch (error: any) {
    console.error('Seed permissions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || 'Lỗi server'
    }, { status: 500 });
  }
}
