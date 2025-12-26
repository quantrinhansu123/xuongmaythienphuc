-- =====================================================
-- HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO - POS SYSTEM
-- Database: PostgreSQL
-- =====================================================

-- Tạo database
CREATE DATABASE pos_system;
\c pos_system;

-- =====================================================
-- 1. KHỐI QUẢN TRỊ HỆ THỐNG & PHÂN QUYỀN
-- =====================================================

-- Bảng Chi nhánh
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    branch_code VARCHAR(20) UNIQUE NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Kho hàng
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    address TEXT,
    warehouse_type VARCHAR(20) DEFAULT 'THANH_PHAM' CHECK (warehouse_type IN ('NVL', 'THANH_PHAM')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN warehouses.warehouse_type IS 'Loại kho: NVL (Nguyên vật liệu) hoặc THANH_PHAM (Thành phẩm)';

-- Bảng Vai trò
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Người dùng
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_code VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    branch_id INTEGER REFERENCES branches(id),
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Quyền hạn
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT
);

-- Bảng Phân quyền chi tiết
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(role_id, permission_id)
);

-- Bảng Cấu hình công ty
CREATE TABLE company_config (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    header_text TEXT,
    footer_text TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. KHỐI QUẢN LÝ SẢN PHẨM & NGUYÊN VẬT LIỆU
-- =====================================================

-- Bảng Danh mục sản phẩm
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES product_categories(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Nguyên vật liệu
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) UNIQUE NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Sản phẩm
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES product_categories(id),
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    cost_price DECIMAL(15,2),
    branch_id INTEGER REFERENCES branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Định mức nguyên liệu (BOM)
CREATE TABLE bom (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    material_id INTEGER REFERENCES materials(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, material_id)
);

-- =====================================================
-- 3. KHỐI QUẢN LÝ KHO
-- =====================================================

-- Bảng Phiếu kho
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- NHAP, XUAT, CHUYEN
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    reference_id INTEGER,
    reference_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, COMPLETED, CANCELLED
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Bảng Chi tiết phiếu kho
CREATE TABLE inventory_transaction_details (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES inventory_transactions(id),
    product_id INTEGER REFERENCES products(id),
    material_id INTEGER REFERENCES materials(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    notes TEXT
);

-- Bảng Tồn kho
CREATE TABLE inventory_balances (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id),
    product_id INTEGER REFERENCES products(id),
    material_id INTEGER REFERENCES materials(id),
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, product_id, material_id)
);

-- =====================================================
-- 4. KHỐI BÁN HÀNG & CRM
-- =====================================================

-- Bảng Nhóm khách hàng
CREATE TABLE customer_groups (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    price_multiplier DECIMAL(5,3) DEFAULT 1.000,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Khách hàng
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    customer_group_id INTEGER REFERENCES customer_groups(id),
    branch_id INTEGER REFERENCES branches(id),
    debt_amount DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Đơn hàng
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    branch_id INTEGER REFERENCES branches(id),
    order_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chi tiết đơn hàng
CREATE TABLE order_details (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL,
    notes TEXT
);

-- =====================================================
-- 5. KHỐI MUA HÀNG & NHÀ CUNG CẤP
-- =====================================================

-- Bảng Nhóm nhà cung cấp
CREATE TABLE supplier_groups (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Nhà cung cấp
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    supplier_group_id INTEGER REFERENCES supplier_groups(id),
    branch_id INTEGER REFERENCES branches(id),
    debt_amount DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Đơn đặt hàng
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    branch_id INTEGER REFERENCES branches(id),
    order_date DATE NOT NULL,
    expected_date DATE,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chi tiết đơn đặt hàng
CREATE TABLE purchase_order_details (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    material_id INTEGER REFERENCES materials(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    notes TEXT
);

-- =====================================================
-- 6. KHỐI TÀI CHÍNH & KẾ TOÁN
-- =====================================================

-- Bảng Danh mục thu/chi
CREATE TABLE financial_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- THU or CHI
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Tài khoản ngân hàng
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    balance DECIMAL(15,2) DEFAULT 0,
    branch_id INTEGER REFERENCES branches(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Sổ quỹ
CREATE TABLE cash_books (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    financial_category_id INTEGER REFERENCES financial_categories(id),
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- THU or CHI
    payment_method VARCHAR(20) NOT NULL, -- CASH, BANK, TRANSFER
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    reference_id INTEGER,
    reference_type VARCHAR(50),
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Quản lý công nợ
CREATE TABLE debt_management (
    id SERIAL PRIMARY KEY,
    debt_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    debt_type VARCHAR(20) NOT NULL, -- RECEIVABLE or PAYABLE
    original_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Thanh toán công nợ
CREATE TABLE debt_payments (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER REFERENCES debt_management(id),
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES ĐỂ TỐI ƯU HIỆU NĂNG
-- =====================================================

CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_products_branch ON products(branch_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_customers_branch ON customers(branch_id);
CREATE INDEX idx_customers_group ON customers(customer_group_id);
CREATE INDEX idx_suppliers_branch ON suppliers(branch_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_inventory_warehouse ON inventory_balances(warehouse_id);
CREATE INDEX idx_inventory_product ON inventory_balances(product_id);
CREATE INDEX idx_inventory_material ON inventory_balances(material_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers cho các bảng cần updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debt_management_updated_at 
    BEFORE UPDATE ON debt_management 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DỮ LIỆU MẪU CƠ BẢN
-- =====================================================

-- Insert chi nhánh mẫu
INSERT INTO branches (branch_code, branch_name, address) VALUES 
('CN_01', 'Chi nhánh trung tâm', 'Địa chỉ trung tâm');

-- Insert vai trò mẫu
INSERT INTO roles (role_code, role_name, description) VALUES 
('ADMIN', 'Quản trị hệ thống', 'Toàn quyền hệ thống'),
('MANAGER', 'Quản lý chi nhánh', 'Quản lý chi nhánh'),
('STAFF', 'Nhân viên', 'Nhân viên bán hàng');

-- Insert cấu hình công ty
INSERT INTO company_config (company_name, tax_code, address, phone, email, header_text) VALUES 
('Công ty TNHH May mặc ABC', '0123456789', '123 Đường ABC, Quận 1, TP.HCM', '028 1234 5678', 'info@abctextile.com', 'HÓA ĐƠN BÁN HÀNG');

-- Insert nhóm khách hàng mẫu
INSERT INTO customer_groups (group_code, group_name, price_multiplier, description) VALUES 
('KH_LE', 'Khách lẻ', 1.500, 'Khách hàng mua lẻ'),
('KH_SI', 'Khách sỉ', 1.200, 'Khách hàng mua sỉ'),
('KH_VIP', 'Khách VIP', 1.100, 'Khách hàng VIP');

-- Insert danh mục thu/chi mẫu
INSERT INTO financial_categories (category_code, category_name, type, description) VALUES 
('THU_BH', 'Thu tiền bán hàng', 'THU', 'Thu tiền từ khách hàng'),
('CHI_MH', 'Chi tiền mua hàng', 'CHI', 'Chi tiền cho nhà cung cấp'),
('CHI_LUONG', 'Chi lương', 'CHI', 'Chi lương nhân viên'),
('CHI_KHAC', 'Chi khác', 'CHI', 'Chi phí khác');

-- =====================================================
-- HOÀN TẤT
-- =====================================================

-- Hiển thị thông báo
SELECT 'Database schema created successfully!' AS status;
