-- Migration: Thêm bảng items (hàng hoá) và cập nhật order_details
-- Ngày: 2025-11-28

-- 1. Tạo bảng items (hàng hoá)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- PRODUCT hoặc MATERIAL
    product_id INTEGER REFERENCES products(id),
    material_id INTEGER REFERENCES materials(id),
    unit VARCHAR(50) NOT NULL,
    cost_price DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_item_type CHECK (item_type IN ('PRODUCT', 'MATERIAL')),
    CONSTRAINT chk_item_reference CHECK (
        (item_type = 'PRODUCT' AND product_id IS NOT NULL AND material_id IS NULL) OR
        (item_type = 'MATERIAL' AND material_id IS NOT NULL AND product_id IS NULL)
    )
);

-- 2. Thêm cột item_id vào order_details
ALTER TABLE order_details 
ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id);

-- 3. Tạo index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_items_item_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_product_id ON items(product_id);
CREATE INDEX IF NOT EXISTS idx_items_material_id ON items(material_id);
CREATE INDEX IF NOT EXISTS idx_order_details_item_id ON order_details(item_id);

-- 4. Tự động tạo items từ products hiện có (nếu muốn)
-- INSERT INTO items (item_code, item_name, item_type, product_id, unit, cost_price)
-- SELECT 
--     'HH-' || product_code,
--     product_name,
--     'PRODUCT',
--     id,
--     unit,
--     cost_price
-- FROM products
-- WHERE NOT EXISTS (SELECT 1 FROM items WHERE product_id = products.id);

-- 5. Tự động tạo items từ materials hiện có (nếu muốn)
-- INSERT INTO items (item_code, item_name, item_type, material_id, unit, cost_price)
-- SELECT 
--     'HH-' || material_code,
--     material_name,
--     'MATERIAL',
--     id,
--     unit,
--     0
-- FROM materials
-- WHERE NOT EXISTS (SELECT 1 FROM items WHERE material_id = materials.id);
