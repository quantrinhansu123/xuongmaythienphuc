-- Quick seed permissions - Chạy trực tiếp trên Supabase SQL Editor

-- Bước 1: Xóa dữ liệu cũ
TRUNCATE TABLE role_permissions CASCADE;
TRUNCATE TABLE permissions RESTART IDENTITY CASCADE;

-- Bước 2: Insert permissions
INSERT INTO permissions (permission_code, permission_name, module, description) VALUES
('admin.users', 'Quản lý người dùng', 'admin', 'Xem, thêm, sửa, xóa người dùng'),
('admin.roles', 'Quản lý vai trò', 'admin', 'Xem, thêm, sửa, xóa vai trò'),
('admin.branches', 'Quản lý chi nhánh', 'admin', 'Xem, thêm, sửa, xóa chi nhánh'),
('admin.warehouses', 'Quản lý kho', 'admin', 'Xem, thêm, sửa, xóa kho'),
('products.categories', 'Quản lý danh mục SP', 'products', 'Xem, thêm, sửa, xóa danh mục'),
('products.products', 'Quản lý sản phẩm', 'products', 'Xem, thêm, sửa, xóa sản phẩm'),
('products.materials', 'Quản lý NVL', 'products', 'Xem, thêm, sửa, xóa nguyên vật liệu'),
('products.bom', 'Quản lý định mức', 'products', 'Xem, thêm, sửa, xóa BOM'),
('inventory.import', 'Nhập kho', 'inventory', 'Xem, tạo, duyệt phiếu nhập'),
('inventory.export', 'Xuất kho', 'inventory', 'Xem, tạo, duyệt phiếu xuất'),
('inventory.transfer', 'Chuyển kho', 'inventory', 'Xem, tạo, duyệt phiếu chuyển'),
('inventory.balance', 'Xem tồn kho', 'inventory', 'Xem báo cáo tồn kho'),
('sales.customers', 'Quản lý khách hàng', 'sales', 'Xem, thêm, sửa, xóa khách hàng'),
('sales.orders', 'Quản lý đơn hàng', 'sales', 'Xem, tạo, sửa, xóa đơn hàng'),
('sales.reports', 'Báo cáo bán hàng', 'sales', 'Xem báo cáo bán hàng'),
('purchasing.suppliers', 'Quản lý NCC', 'purchasing', 'Xem, thêm, sửa, xóa nhà cung cấp'),
('purchasing.orders', 'Quản lý đơn mua', 'purchasing', 'Xem, tạo, sửa, xóa đơn mua'),
('finance.cashbook', 'Quản lý sổ quỹ', 'finance', 'Xem, thêm, sửa, xóa phiếu thu/chi'),
('finance.debt', 'Quản lý công nợ', 'finance', 'Xem, thêm, thanh toán công nợ'),
('finance.reports', 'Báo cáo tài chính', 'finance', 'Xem báo cáo tài chính');

-- Bước 3: Phân quyền cho ADMIN (full quyền tất cả)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN' LIMIT 1),
  id,
  true,
  true,
  true,
  true
FROM permissions;

-- Bước 4: Phân quyền cho MANAGER (full quyền trừ admin.users, admin.roles)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'MANAGER' LIMIT 1),
  id,
  true,
  true,
  true,
  true
FROM permissions 
WHERE permission_code NOT IN ('admin.users', 'admin.roles');

-- Bước 5: Phân quyền cho STAFF (giới hạn)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'STAFF' LIMIT 1),
  id,
  CASE 
    WHEN permission_code IN ('products.products', 'sales.customers', 'sales.orders', 'inventory.balance') THEN true
    ELSE false
  END,
  CASE 
    WHEN permission_code IN ('sales.customers', 'sales.orders') THEN true
    ELSE false
  END,
  CASE 
    WHEN permission_code = 'sales.orders' THEN true
    ELSE false
  END,
  false
FROM permissions
WHERE permission_code IN ('products.products', 'sales.customers', 'sales.orders', 'inventory.balance');

-- Kiểm tra kết quả
SELECT 'Permissions created:' as info, COUNT(*) as count FROM permissions
UNION ALL
SELECT 'Role permissions created:', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'ADMIN permissions:', COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN' LIMIT 1)
UNION ALL
SELECT 'MANAGER permissions:', COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE role_code = 'MANAGER' LIMIT 1)
UNION ALL
SELECT 'STAFF permissions:', COUNT(*) FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE role_code = 'STAFF' LIMIT 1);
