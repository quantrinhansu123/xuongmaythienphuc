-- Seed permissions cho hệ thống
\c pos_system;

-- Xóa dữ liệu cũ nếu có (cascade để tránh lỗi foreign key)
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE role_code IN ('ADMIN', 'MANAGER', 'STAFF'));
DELETE FROM permissions WHERE id > 0;

-- Insert permissions cho từng module (ON CONFLICT để tránh duplicate)
INSERT INTO permissions (permission_code, permission_name, module, description) VALUES
-- Admin module
('admin.users', 'Quản lý người dùng', 'admin', 'Xem, thêm, sửa, xóa người dùng'),
('admin.roles', 'Quản lý vai trò', 'admin', 'Xem, thêm, sửa, xóa vai trò'),
('admin.branches', 'Quản lý chi nhánh', 'admin', 'Xem, thêm, sửa, xóa chi nhánh'),
('admin.warehouses', 'Quản lý kho', 'admin', 'Xem, thêm, sửa, xóa kho'),

-- Products module
('products.categories', 'Quản lý danh mục SP', 'products', 'Xem, thêm, sửa, xóa danh mục'),
('products.products', 'Quản lý sản phẩm', 'products', 'Xem, thêm, sửa, xóa sản phẩm'),
('products.materials', 'Quản lý NVL', 'products', 'Xem, thêm, sửa, xóa nguyên vật liệu'),
('products.bom', 'Quản lý định mức', 'products', 'Xem, thêm, sửa, xóa BOM'),

-- Inventory module
('inventory.import', 'Nhập kho', 'inventory', 'Xem, tạo, duyệt phiếu nhập'),
('inventory.export', 'Xuất kho', 'inventory', 'Xem, tạo, duyệt phiếu xuất'),
('inventory.transfer', 'Chuyển kho', 'inventory', 'Xem, tạo, duyệt phiếu chuyển'),
('inventory.balance', 'Xem tồn kho', 'inventory', 'Xem báo cáo tồn kho'),

-- Sales module
('sales.customers', 'Quản lý khách hàng', 'sales', 'Xem, thêm, sửa, xóa khách hàng'),
('sales.orders', 'Quản lý đơn hàng', 'sales', 'Xem, tạo, sửa, xóa đơn hàng'),
('sales.reports', 'Báo cáo bán hàng', 'sales', 'Xem báo cáo bán hàng'),

-- Purchasing module
('purchasing.suppliers', 'Quản lý NCC', 'purchasing', 'Xem, thêm, sửa, xóa nhà cung cấp'),
('purchasing.orders', 'Quản lý đơn mua', 'purchasing', 'Xem, tạo, sửa, xóa đơn mua'),

-- Finance module
('finance.categories', 'Quản lý danh mục tài chính', 'finance', 'Xem, thêm, sửa, xóa danh mục thu/chi'),
('finance.cashbooks', 'Quản lý sổ quỹ', 'finance', 'Xem, thêm, sửa, xóa phiếu thu/chi'),
('finance.debts', 'Quản lý công nợ', 'finance', 'Xem, thêm, thanh toán công nợ'),
('finance.reports', 'Báo cáo tài chính', 'finance', 'Xem báo cáo tài chính')
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  module = EXCLUDED.module,
  description = EXCLUDED.description;

-- Phân quyền cho ADMIN (full quyền)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
SELECT (SELECT id FROM roles WHERE role_code = 'ADMIN'), id, true, true, true, true FROM permissions;

-- Phân quyền cho MANAGER (full quyền trừ admin.users, admin.roles)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
SELECT (SELECT id FROM roles WHERE role_code = 'MANAGER'), id, true, true, true, true 
FROM permissions 
WHERE permission_code NOT IN ('admin.users', 'admin.roles');

-- Phân quyền cho STAFF (chỉ xem và tạo đơn hàng, xem sản phẩm, khách hàng)
INSERT INTO role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
VALUES
((SELECT id FROM roles WHERE role_code = 'STAFF'), (SELECT id FROM permissions WHERE permission_code = 'products.products'), true, false, false, false),
((SELECT id FROM roles WHERE role_code = 'STAFF'), (SELECT id FROM permissions WHERE permission_code = 'sales.customers'), true, true, false, false),
((SELECT id FROM roles WHERE role_code = 'STAFF'), (SELECT id FROM permissions WHERE permission_code = 'sales.orders'), true, true, true, false),
((SELECT id FROM roles WHERE role_code = 'STAFF'), (SELECT id FROM permissions WHERE permission_code = 'inventory.balance'), true, false, false, false);

SELECT 'Permissions seeded successfully!' AS status;
