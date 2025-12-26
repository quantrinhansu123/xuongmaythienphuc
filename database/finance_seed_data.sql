-- Seed dữ liệu mẫu cho module tài chính
-- Chạy sau khi đã có schema và permissions

-- Thêm danh mục tài chính mẫu (nếu chưa có)
INSERT INTO financial_categories (category_code, category_name, type, description) VALUES
-- Danh mục THU
('THU001', 'Thu tiền bán hàng', 'THU', 'Thu tiền từ khách hàng mua hàng'),
('THU002', 'Thu công nợ khách hàng', 'THU', 'Thu tiền công nợ từ khách hàng'),
('THU003', 'Thu lãi ngân hàng', 'THU', 'Lãi tiền gửi ngân hàng'),
('THU004', 'Thu khác', 'THU', 'Các khoản thu khác'),

-- Danh mục CHI
('CHI001', 'Chi mua nguyên vật liệu', 'CHI', 'Chi tiền mua nguyên vật liệu sản xuất'),
('CHI002', 'Chi trả công nợ nhà cung cấp', 'CHI', 'Thanh toán công nợ cho nhà cung cấp'),
('CHI003', 'Chi lương nhân viên', 'CHI', 'Chi trả lương cho nhân viên'),
('CHI004', 'Chi điện nước', 'CHI', 'Chi phí điện, nước, internet'),
('CHI005', 'Chi thuê mặt bằng', 'CHI', 'Chi phí thuê nhà xưởng, văn phòng'),
('CHI006', 'Chi vận chuyển', 'CHI', 'Chi phí vận chuyển hàng hóa'),
('CHI007', 'Chi sửa chữa bảo trì', 'CHI', 'Chi phí sửa chữa máy móc, thiết bị'),
('CHI008', 'Chi văn phòng phẩm', 'CHI', 'Chi phí mua văn phòng phẩm'),
('CHI009', 'Chi khác', 'CHI', 'Các khoản chi khác')
ON CONFLICT (category_code) DO NOTHING;

-- Thêm tài khoản ngân hàng mẫu
INSERT INTO bank_accounts (account_number, account_holder, bank_name, branch_name, balance, branch_id) VALUES
('1234567890', 'CÔNG TY TNHH ABC', 'Vietcombank', 'Chi nhánh Hà Nội', 100000000, 1),
('0987654321', 'CÔNG TY TNHH ABC', 'Techcombank', 'Chi nhánh TP.HCM', 50000000, 1),
('1122334455', 'CÔNG TY TNHH ABC', 'VietinBank', 'Chi nhánh Đà Nẵng', 30000000, 1)
ON CONFLICT DO NOTHING;

-- Thêm một số phiếu thu mẫu
INSERT INTO cash_books (
  transaction_code, transaction_date, financial_category_id, 
  amount, transaction_type, payment_method, description, 
  created_by, branch_id
) VALUES
('PT2411220001', '2024-11-20', (SELECT id FROM financial_categories WHERE category_code = 'THU001'), 15000000, 'THU', 'CASH', 'Thu tiền bán hàng đơn DH001', 1, 1),
('PT2411220002', '2024-11-21', (SELECT id FROM financial_categories WHERE category_code = 'THU001'), 8500000, 'THU', 'BANK', 'Thu tiền bán hàng đơn DH002', 1, 1),
('PT2411220003', '2024-11-22', (SELECT id FROM financial_categories WHERE category_code = 'THU002'), 5000000, 'THU', 'CASH', 'Thu công nợ khách hàng Nguyễn Văn A', 1, 1)
ON CONFLICT (transaction_code) DO NOTHING;

-- Thêm một số phiếu chi mẫu
INSERT INTO cash_books (
  transaction_code, transaction_date, financial_category_id, 
  amount, transaction_type, payment_method, description, 
  created_by, branch_id
) VALUES
('PC2411220001', '2024-11-20', (SELECT id FROM financial_categories WHERE category_code = 'CHI001'), 12000000, 'CHI', 'BANK', 'Chi mua nguyên vật liệu từ NCC A', 1, 1),
('PC2411220002', '2024-11-21', (SELECT id FROM financial_categories WHERE category_code = 'CHI003'), 25000000, 'CHI', 'BANK', 'Chi lương tháng 11/2024', 1, 1),
('PC2411220003', '2024-11-22', (SELECT id FROM financial_categories WHERE category_code = 'CHI004'), 3500000, 'CHI', 'CASH', 'Chi điện nước tháng 11', 1, 1),
('PC2411220004', '2024-11-22', (SELECT id FROM financial_categories WHERE category_code = 'CHI005'), 15000000, 'CHI', 'BANK', 'Chi thuê mặt bằng tháng 11', 1, 1)
ON CONFLICT (transaction_code) DO NOTHING;

-- Thêm công nợ phải thu từ khách hàng (giả sử đã có customers)
INSERT INTO debt_management (
  debt_code, customer_id, debt_type, original_amount, 
  remaining_amount, due_date, status, notes
) 
SELECT 
  'CN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0'),
  c.id,
  'RECEIVABLE',
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 10000000
    WHEN ROW_NUMBER() OVER () = 2 THEN 15000000
    ELSE 8000000
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 5000000
    WHEN ROW_NUMBER() OVER () = 2 THEN 15000000
    ELSE 3000000
  END,
  CURRENT_DATE + INTERVAL '30 days',
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 'PARTIAL'
    WHEN ROW_NUMBER() OVER () = 2 THEN 'PENDING'
    ELSE 'PARTIAL'
  END,
  'Công nợ từ đơn hàng'
FROM customers c
LIMIT 3
ON CONFLICT (debt_code) DO NOTHING;

-- Thêm công nợ phải trả cho nhà cung cấp (giả sử đã có suppliers)
INSERT INTO debt_management (
  debt_code, supplier_id, debt_type, original_amount, 
  remaining_amount, due_date, status, notes
) 
SELECT 
  'CN' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD((1000 + ROW_NUMBER() OVER ())::TEXT, 4, '0'),
  s.id,
  'PAYABLE',
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 20000000
    WHEN ROW_NUMBER() OVER () = 2 THEN 12000000
    ELSE 8000000
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 10000000
    WHEN ROW_NUMBER() OVER () = 2 THEN 12000000
    ELSE 4000000
  END,
  CURRENT_DATE + INTERVAL '15 days',
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 'PARTIAL'
    WHEN ROW_NUMBER() OVER () = 2 THEN 'PENDING'
    ELSE 'PARTIAL'
  END,
  'Công nợ từ đơn mua hàng'
FROM suppliers s
LIMIT 3
ON CONFLICT (debt_code) DO NOTHING;

-- Thêm một số thanh toán công nợ mẫu
INSERT INTO debt_payments (
  debt_id, payment_amount, payment_date, 
  payment_method, notes, created_by
)
SELECT 
  dm.id,
  5000000,
  CURRENT_DATE - INTERVAL '5 days',
  'CASH',
  'Thanh toán đợt 1',
  1
FROM debt_management dm
WHERE dm.status = 'PARTIAL' AND dm.debt_type = 'RECEIVABLE'
LIMIT 1
ON CONFLICT DO NOTHING;

SELECT 'Finance seed data inserted successfully!' AS status;
SELECT 
  (SELECT COUNT(*) FROM financial_categories) AS categories_count,
  (SELECT COUNT(*) FROM bank_accounts) AS bank_accounts_count,
  (SELECT COUNT(*) FROM cash_books) AS cash_books_count,
  (SELECT COUNT(*) FROM debt_management) AS debts_count,
  (SELECT COUNT(*) FROM debt_payments) AS payments_count;
