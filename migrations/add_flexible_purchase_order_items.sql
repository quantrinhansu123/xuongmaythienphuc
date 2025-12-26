-- Thêm các cột để cho phép nhập tự do item không có trong danh sách NVL
ALTER TABLE purchase_order_details 
ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Cho phép material_id nullable (vì có thể nhập tự do)
ALTER TABLE purchase_order_details 
ALTER COLUMN material_id DROP NOT NULL;

-- Comment
COMMENT ON COLUMN purchase_order_details.item_code IS 'Mã sản phẩm/NVL (tự nhập hoặc từ materials)';
COMMENT ON COLUMN purchase_order_details.item_name IS 'Tên sản phẩm/NVL (tự nhập hoặc từ materials)';
COMMENT ON COLUMN purchase_order_details.unit IS 'Đơn vị tính (tự nhập hoặc từ materials)';

-- Cập nhật dữ liệu cũ từ materials
UPDATE purchase_order_details pod
SET 
  item_code = m.material_code,
  item_name = m.material_name,
  unit = m.unit
FROM materials m
WHERE pod.material_id = m.id 
  AND (pod.item_name IS NULL OR pod.item_name = '');

SELECT 'Purchase order details updated for flexible items!' AS status;
