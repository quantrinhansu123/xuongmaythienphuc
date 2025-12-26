-- Cập nhật bảng debt_management để thêm các trường mới
\c pos_system;

-- Thêm cột paid_amount (đã trả) - BỎ deposit_amount
ALTER TABLE debt_management 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;

-- Cập nhật lại remaining_amount = original_amount - paid_amount
UPDATE debt_management 
SET paid_amount = original_amount - remaining_amount
WHERE paid_amount = 0;

-- Thêm comment để giải thích
COMMENT ON COLUMN debt_management.paid_amount IS 'Tổng số tiền đã thanh toán';
COMMENT ON COLUMN debt_management.remaining_amount IS 'Số tiền còn phải trả = original_amount - paid_amount';

-- Thêm trigger để tự động cập nhật remaining_amount khi có thanh toán
CREATE OR REPLACE FUNCTION update_debt_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật paid_amount và remaining_amount của debt
    UPDATE debt_management
    SET 
        paid_amount = paid_amount + NEW.payment_amount,
        remaining_amount = original_amount - (paid_amount + NEW.payment_amount),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.debt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
DROP TRIGGER IF EXISTS trigger_update_debt_remaining ON debt_payments;
CREATE TRIGGER trigger_update_debt_remaining
    AFTER INSERT ON debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_remaining_amount();

-- Cập nhật bảng orders để thêm trường thanh toán
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID';

COMMENT ON COLUMN orders.paid_amount IS 'Số tiền đã thanh toán';
COMMENT ON COLUMN orders.payment_status IS 'UNPAID, PARTIAL, PAID';

-- Cập nhật bảng purchase_orders để thêm trường thanh toán
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID';

COMMENT ON COLUMN purchase_orders.paid_amount IS 'Số tiền đã thanh toán';
COMMENT ON COLUMN purchase_orders.payment_status IS 'UNPAID, PARTIAL, PAID';

SELECT 'Debt management updated successfully!' AS status;
