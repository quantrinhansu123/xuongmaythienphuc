-- Tạo bảng lịch sử đơn hàng
CREATE TABLE IF NOT EXISTS order_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm index
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);

-- Comment
COMMENT ON TABLE order_history IS 'Lịch sử thay đổi trạng thái đơn hàng';
COMMENT ON COLUMN order_history.status IS 'Trạng thái: PENDING, CONFIRMED, WAITING_MATERIAL, IN_PRODUCTION, COMPLETED, CANCELLED';
