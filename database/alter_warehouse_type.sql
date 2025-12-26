-- Thêm cột warehouse_type vào bảng warehouses
\c pos_system;

-- Thêm cột warehouse_type
ALTER TABLE warehouses 
ADD COLUMN warehouse_type VARCHAR(20) DEFAULT 'THANH_PHAM';

-- Thêm comment
COMMENT ON COLUMN warehouses.warehouse_type IS 'Loại kho: NVL (Nguyên vật liệu) hoặc THANH_PHAM (Thành phẩm)';

-- Cập nhật dữ liệu mẫu nếu có
UPDATE warehouses SET warehouse_type = 'THANH_PHAM' WHERE warehouse_type IS NULL;

-- Thêm constraint để chỉ cho phép 2 giá trị
ALTER TABLE warehouses 
ADD CONSTRAINT check_warehouse_type 
CHECK (warehouse_type IN ('NVL', 'THANH_PHAM'));

SELECT 'Warehouse type column added successfully!' AS status;
