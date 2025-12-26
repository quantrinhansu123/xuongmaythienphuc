-- Script tạo dữ liệu mẫu để test hệ thống
-- Chạy sau khi đã chạy schema.sql

\c pos_system;

-- Tạo user admin mẫu (password: admin123)
INSERT INTO users (user_code, username, password_hash, full_name, email, branch_id, role_id, is_active)
VALUES ('USR001', 'admin', 'admin123', 'Quản trị viên', 'admin@example.com', 1, 1, true)
ON CONFLICT (username) DO NOTHING;

-- Tạo thêm user staff mẫu (password: staff123)
INSERT INTO users (user_code, username, password_hash, full_name, email, branch_id, role_id, is_active)
VALUES ('USR002', 'staff', 'staff123', 'Nhân viên bán hàng', 'staff@example.com', 1, 3, true)
ON CONFLICT (username) DO NOTHING;

SELECT 'Seed data created successfully!' AS status;
SELECT 'Login với: username=admin, password=admin123' AS info;
