-- Kiểm tra dữ liệu tồn kho

-- 1. Xem tất cả tồn kho
SELECT 
  ib.id,
  w.warehouse_code,
  w.warehouse_name,
  COALESCE(m.material_code, p.product_code) as item_code,
  COALESCE(m.material_name, p.product_name) as item_name,
  ib.quantity,
  ib.last_updated
FROM inventory_balances ib
LEFT JOIN warehouses w ON w.id = ib.warehouse_id
LEFT JOIN materials m ON m.id = ib.material_id
LEFT JOIN products p ON p.id = ib.product_id
ORDER BY w.warehouse_name, item_name;

-- 2. Kiểm tra kiểu dữ liệu quantity
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'inventory_balances' 
  AND column_name = 'quantity';

-- 3. Xem tổng tồn theo kho
SELECT 
  w.warehouse_code,
  w.warehouse_name,
  COUNT(*) as total_items,
  SUM(ib.quantity) as total_quantity
FROM inventory_balances ib
JOIN warehouses w ON w.id = ib.warehouse_id
GROUP BY w.id, w.warehouse_code, w.warehouse_name
ORDER BY w.warehouse_name;

-- 4. Xem các giao dịch gần đây
SELECT 
  it.transaction_code,
  it.transaction_type,
  it.status,
  it.created_at,
  COUNT(itd.id) as detail_count
FROM inventory_transactions it
LEFT JOIN inventory_transaction_details itd ON itd.transaction_id = it.id
GROUP BY it.id, it.transaction_code, it.transaction_type, it.status, it.created_at
ORDER BY it.created_at DESC
LIMIT 10;
