-- Seed dữ liệu mẫu cho module Tài chính
-- Chạy sau khi đã có dữ liệu branches, users, customers, suppliers

\c pos_system;

-- 1. Thêm danh mục tài chính mẫu
INSERT INTO financial_categories (category_code, category_name, type, description) VALUES
-- Danh mục THU
('THU001', 'Bán hàng', 'THU', 'Thu tiền từ bán hàng'),
('THU002', 'Thu nợ khách hàng', 'THU', 'Thu tiền nợ từ khách hàng'),
('THU003', 'Thu khác', 'THU', 'Các khoản thu khác'),
('THU004', 'Hoàn tiền', 'THU', 'Hoàn tiền từ nhà cung cấp'),

-- Danh mục CHI
('CHI001', 'Mua nguyên vật liệu', 'CHI', 'Chi phí mua nguyên vật liệu'),
('CHI002', 'Lương nhân viên', 'CHI', 'Chi trả lương nhân viên'),
('CHI003', 'Tiền điện nước', 'CHI', 'Chi phí điện nước'),
('CHI004', 'Tiền thuê mặt bằng', 'CHI', 'Chi phí thuê mặt bằng'),
('CHI005', 'Chi phí vận chuyển', 'CHI', 'Chi phí vận chuyển hàng hóa'),
('CHI006', 'Trả nợ nhà cung cấp', 'CHI', 'Thanh toán công nợ cho nhà cung cấp'),
('CHI007', 'Chi phí khác', 'CHI', 'Các chi phí khác')
ON CONFLICT (category_code) DO NOTHING;

-- 2. Thêm tài khoản ngân hàng mẫu
INSERT INTO bank_accounts (account_number, account_holder, bank_name, branch_name, balance, branch_id) VALUES
('1234567890', 'CÔNG TY TNHH ABC', 'Vietcombank', 'Chi nhánh Hà Nội', 500000000, 1),
('0987654321', 'CÔNG TY TNHH ABC', 'Techcombank', 'Chi nhánh Hồ Chí Minh', 300000000, 1),
('1122334455', 'CÔNG TY TNHH ABC', 'BIDV', 'Chi nhánh Đà Nẵng', 200000000, 1)
ON CONFLICT DO NOTHING;

-- 3. Thêm phiếu thu/chi mẫu
-- Lấy ID của danh mục và tài khoản
DO $$
DECLARE
    thu_ban_hang_id INTEGER;
    chi_luong_id INTEGER;
    chi_dien_nuoc_id INTEGER;
    bank_vcb_id INTEGER;
    user_admin_id INTEGER;
    branch_id INTEGER;
BEGIN
    -- Lấy IDs
    SELECT id INTO thu_ban_hang_id FROM financial_categories WHERE category_code = 'THU001';
    SELECT id INTO chi_luong_id FROM financial_categories WHERE category_code = 'CHI002';
    SELECT id INTO chi_dien_nuoc_id FROM financial_categories WHERE category_code = 'CHI003';
    SELECT id INTO bank_vcb_id FROM bank_accounts WHERE account_number = '1234567890';
    SELECT id INTO user_admin_id FROM users WHERE username = 'admin' LIMIT 1;
    SELECT id INTO branch_id FROM branches LIMIT 1;

    -- Thêm phiếu thu từ bán hàng
    INSERT INTO cash_books (
        transaction_code, transaction_date, financial_category_id, 
        amount, transaction_type, payment_method, bank_account_id,
        description, created_by, branch_id
    ) VALUES
    ('PT001', CURRENT_DATE - INTERVAL '5 days', thu_ban_hang_id, 15000000, 'THU', 'BANK', bank_vcb_id, 
     'Thu tiền bán hàng tháng 11', user_admin_id, branch_id),
    ('PT002', CURRENT_DATE - INTERVAL '3 days', thu_ban_hang_id, 8000000, 'THU', 'CASH', NULL, 
     'Thu tiền bán hàng lẻ', user_admin_id, branch_id),
    ('PT003', CURRENT_DATE - INTERVAL '1 day', thu_ban_hang_id, 12000000, 'THU', 'TRANSFER', bank_vcb_id, 
     'Thu tiền chuyển khoản từ khách hàng', user_admin_id, branch_id);

    -- Thêm phiếu chi
    INSERT INTO cash_books (
        transaction_code, transaction_date, financial_category_id, 
        amount, transaction_type, payment_method, bank_account_id,
        description, created_by, branch_id
    ) VALUES
    ('PC001', CURRENT_DATE - INTERVAL '4 days', chi_luong_id, 20000000, 'CHI', 'BANK', bank_vcb_id, 
     'Chi trả lương tháng 11', user_admin_id, branch_id),
    ('PC002', CURRENT_DATE - INTERVAL '2 days', chi_dien_nuoc_id, 3000000, 'CHI', 'CASH', NULL, 
     'Chi phí điện nước tháng 11', user_admin_id, branch_id);

    -- Cập nhật số dư tài khoản ngân hàng
    -- Số dư ban đầu: 500,000,000
    -- + PT001: 15,000,000
    -- + PT003: 12,000,000
    -- - PC001: 20,000,000
    -- = 507,000,000
    UPDATE bank_accounts 
    SET balance = 507000000 
    WHERE account_number = '1234567890';

END $$;

-- 4. Thêm công nợ mẫu
-- Công nợ phải thu từ khách hàng
DO $$
DECLARE
    customer_id INTEGER;
    supplier_id INTEGER;
BEGIN
    -- Lấy ID khách hàng đầu tiên
    SELECT id INTO customer_id FROM customers LIMIT 1;
    
    IF customer_id IS NOT NULL THEN
        INSERT INTO debt_management (
            debt_code, customer_id, debt_type, original_amount, 
            remaining_amount, due_date, status, notes
        ) VALUES
        ('CN001', customer_id, 'RECEIVABLE', 10000000, 10000000, 
         CURRENT_DATE + INTERVAL '30 days', 'PENDING', 'Công nợ đơn hàng DH001'),
        ('CN002', customer_id, 'RECEIVABLE', 5000000, 2000000, 
         CURRENT_DATE + INTERVAL '15 days', 'PARTIAL', 'Công nợ đơn hàng DH002 - Đã thu 3tr');
        
        -- Cập nhật debt_amount của khách hàng
        UPDATE customers 
        SET debt_amount = 12000000 
        WHERE id = customer_id;
    END IF;

    -- Lấy ID nhà cung cấp đầu tiên
    SELECT id INTO supplier_id FROM suppliers LIMIT 1;
    
    IF supplier_id IS NOT NULL THEN
        INSERT INTO debt_management (
            debt_code, supplier_id, debt_type, original_amount, 
            remaining_amount, due_date, status, notes
        ) VALUES
        ('CN003', supplier_id, 'PAYABLE', 8000000, 8000000, 
         CURRENT_DATE + INTERVAL '20 days', 'PENDING', 'Công nợ đơn mua PO001');
        
        -- Cập nhật debt_amount của nhà cung cấp
        UPDATE suppliers 
        SET debt_amount = 8000000 
        WHERE id = supplier_id;
    END IF;

END $$;

SELECT 'Finance module seeded successfully!' AS status;

-- Hiển thị tổng kết
SELECT 
    'Financial Categories' as table_name,
    COUNT(*) as record_count 
FROM financial_categories
UNION ALL
SELECT 
    'Bank Accounts' as table_name,
    COUNT(*) as record_count 
FROM bank_accounts
UNION ALL
SELECT 
    'Cash Books' as table_name,
    COUNT(*) as record_count 
FROM cash_books
UNION ALL
SELECT 
    'Debts' as table_name,
    COUNT(*) as record_count 
FROM debt_management;
