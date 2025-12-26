-- Seed data mẫu cho inventory (kho, sản phẩm, NVL, tồn kho)

-- 1. Tạo kho mẫu
INSERT INTO warehouses (warehouse_code, warehouse_name, branch_id, warehouse_type, address, is_active) VALUES
('KHO_NVL_01', 'Kho nguyên vật liệu CN1', 1, 'NVL', 'Địa chỉ kho NVL', true),
('KHO_TP_01', 'Kho thành phẩm CN1', 1, 'THANH_PHAM', 'Địa chỉ kho TP', true)
ON CONFLICT (warehouse_code) DO NOTHING;

-- 2. Tạo danh mục sản phẩm
INSERT INTO product_categories (category_code, category_name, description) VALUES
('CAT_AO', 'Áo', 'Các loại áo'),
('CAT_QUAN', 'Quần', 'Các loại quần')
ON CONFLICT (category_code) DO NOTHING;

-- 3. Tạo nguyên vật liệu mẫu
INSERT INTO materials (material_code, material_name, unit, description, branch_id) VALUES
('NVL_VAI_001', 'Vải cotton trắng', 'mét', 'Vải cotton cao cấp màu trắng', 1),
('NVL_VAI_002', 'Vải kaki xanh', 'mét', 'Vải kaki màu xanh navy', 1),
('NVL_CUC_001', 'Cúc áo 10mm', 'hộp', 'Cúc áo nhựa 10mm (100 cái/hộp)', 1),
('NVL_CHI_001', 'Chỉ may trắng', 'ống', 'Chỉ may polyester màu trắng', 1),
('NVL_CHI_002', 'Chỉ may đen', 'ống', 'Chỉ may polyester màu đen', 1)
ON CONFLICT (material_code) DO NOTHING;

-- 4. Tạo sản phẩm mẫu
INSERT INTO products (product_code, product_name, category_id, unit, cost_price, branch_id, is_active) VALUES
('SP_AO_001', 'Áo sơ mi trắng nam', (SELECT id FROM product_categories WHERE category_code = 'CAT_AO' LIMIT 1), 'cái', 150000, 1, true),
('SP_AO_002', 'Áo thun cotton nữ', (SELECT id FROM product_categories WHERE category_code = 'CAT_AO' LIMIT 1), 'cái', 100000, 1, true),
('SP_QUAN_001', 'Quần kaki nam', (SELECT id FROM product_categories WHERE category_code = 'CAT_QUAN' LIMIT 1), 'cái', 200000, 1, true),
('SP_QUAN_002', 'Quần jean nữ', (SELECT id FROM product_categories WHERE category_code = 'CAT_QUAN' LIMIT 1), 'cái', 250000, 1, true)
ON CONFLICT (product_code) DO NOTHING;

-- 5. Tạo tồn kho mẫu cho NVL
INSERT INTO inventory_balances (warehouse_id, material_id, quantity) VALUES
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_NVL_01' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_VAI_001' LIMIT 1), 500),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_NVL_01' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_VAI_002' LIMIT 1), 300),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_NVL_01' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CUC_001' LIMIT 1), 50),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_NVL_01' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CHI_001' LIMIT 1), 100),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_NVL_01' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CHI_002' LIMIT 1), 80)
ON CONFLICT DO NOTHING;

-- 6. Tạo tồn kho mẫu cho thành phẩm
INSERT INTO inventory_balances (warehouse_id, product_id, quantity) VALUES
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_TP_01' LIMIT 1), (SELECT id FROM products WHERE product_code = 'SP_AO_001' LIMIT 1), 100),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_TP_01' LIMIT 1), (SELECT id FROM products WHERE product_code = 'SP_AO_002' LIMIT 1), 150),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_TP_01' LIMIT 1), (SELECT id FROM products WHERE product_code = 'SP_QUAN_001' LIMIT 1), 80),
((SELECT id FROM warehouses WHERE warehouse_code = 'KHO_TP_01' LIMIT 1), (SELECT id FROM products WHERE product_code = 'SP_QUAN_002' LIMIT 1), 120)
ON CONFLICT DO NOTHING;

-- 7. Tạo BOM (Bill of Materials) mẫu cho sản phẩm
INSERT INTO bom (product_id, material_id, quantity, unit, notes) VALUES
-- Áo sơ mi trắng nam cần:
((SELECT id FROM products WHERE product_code = 'SP_AO_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_VAI_001' LIMIT 1), 1.5, 'mét', 'Vải thân áo'),
((SELECT id FROM products WHERE product_code = 'SP_AO_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CUC_001' LIMIT 1), 0.08, 'hộp', '8 cúc/áo'),
((SELECT id FROM products WHERE product_code = 'SP_AO_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CHI_001' LIMIT 1), 0.2, 'ống', 'Chỉ may'),

-- Quần kaki nam cần:
((SELECT id FROM products WHERE product_code = 'SP_QUAN_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_VAI_002' LIMIT 1), 2.0, 'mét', 'Vải quần'),
((SELECT id FROM products WHERE product_code = 'SP_QUAN_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CUC_001' LIMIT 1), 0.01, 'hộp', '1 cúc/quần'),
((SELECT id FROM products WHERE product_code = 'SP_QUAN_001' LIMIT 1), (SELECT id FROM materials WHERE material_code = 'NVL_CHI_002' LIMIT 1), 0.3, 'ống', 'Chỉ may')
ON CONFLICT DO NOTHING;

SELECT 'Seed data inventory đã được tạo thành công!' as message;
