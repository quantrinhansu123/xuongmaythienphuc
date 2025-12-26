-- Migration: Thêm bảng item_categories (danh mục hàng hoá)
-- Ngày: 2025-11-28

-- 1. Tạo bảng item_categories
CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES item_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thêm cột category_id vào bảng items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES item_categories(id);

-- 3. Tạo index
CREATE INDEX IF NOT EXISTS idx_item_categories_parent_id ON item_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);

-- 4. Insert một số danh mục mẫu (tùy chọn)
-- INSERT INTO item_categories (category_code, category_name, description) VALUES
-- ('DM001', 'Vải', 'Các loại vải'),
-- ('DM002', 'Phụ kiện', 'Phụ kiện may mặc'),
-- ('DM003', 'Sản phẩm hoàn thiện', 'Sản phẩm đã hoàn thiện');
