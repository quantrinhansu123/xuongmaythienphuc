-- Migration: Thêm deposit_amount vào bảng orders
\c pos_system;

-- Thêm cột deposit_amount vào bảng orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2) DEFAULT 0;

-- Cập nhật comment
COMMENT ON COLUMN orders.deposit_amount IS 'Tiền đặt cọc của khách hàng';

-- Cập nhật logic tính payment_status dựa trên deposit_amount + paid_amount
-- Tạo function để tự động tính payment_status
CREATE OR REPLACE FUNCTION calculate_order_payment_status(
    p_deposit_amount DECIMAL,
    p_paid_amount DECIMAL,
    p_final_amount DECIMAL
) RETURNS VARCHAR(20) AS $$
DECLARE
    total_paid DECIMAL;
BEGIN
    total_paid := COALESCE(p_deposit_amount, 0) + COALESCE(p_paid_amount, 0);
    
    IF total_paid = 0 THEN
        RETURN 'UNPAID';
    ELSIF total_paid >= p_final_amount THEN
        RETURN 'PAID';
    ELSE
        RETURN 'PARTIAL';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Cập nhật payment_status cho các đơn hàng hiện có
UPDATE orders
SET payment_status = calculate_order_payment_status(
    COALESCE(deposit_amount, 0),
    COALESCE(paid_amount, 0),
    final_amount
)
WHERE payment_status IS NULL OR payment_status = '';

-- Tạo trigger để tự động cập nhật payment_status khi deposit_amount hoặc paid_amount thay đổi
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.payment_status := calculate_order_payment_status(
        COALESCE(NEW.deposit_amount, 0),
        COALESCE(NEW.paid_amount, 0),
        NEW.final_amount
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
DROP TRIGGER IF EXISTS trigger_update_order_payment_status ON orders;
CREATE TRIGGER trigger_update_order_payment_status
    BEFORE INSERT OR UPDATE OF deposit_amount, paid_amount, final_amount ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_status();

