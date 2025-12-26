-- Thêm các cột tracking cho đơn hàng
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS material_checked_at TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS material_checked_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_started_by INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id);

-- Thêm comment
COMMENT ON COLUMN orders.confirmed_at IS 'Thời gian xác nhận đơn hàng';
COMMENT ON COLUMN orders.confirmed_by IS 'Người xác nhận đơn hàng';
COMMENT ON COLUMN orders.material_checked_at IS 'Thời gian kiểm tra nguyên liệu';
COMMENT ON COLUMN orders.material_checked_by IS 'Người kiểm tra nguyên liệu';
COMMENT ON COLUMN orders.production_started_at IS 'Thời gian bắt đầu sản xuất';
COMMENT ON COLUMN orders.production_started_by IS 'Người bắt đầu sản xuất';
COMMENT ON COLUMN orders.completed_at IS 'Thời gian hoàn thành';
COMMENT ON COLUMN orders.completed_by IS 'Người hoàn thành';
