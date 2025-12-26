-- Script kiểm tra dữ liệu trong database

-- 1. Kiểm tra chi nhánh
SELECT 'Branches:' as table_name;
SELECT * FROM branches;

-- 2. Kiểm tra kho
SELECT 'Warehouses:' as table_name;
SELECT id, warehouse_code, warehouse_name, branch_id, warehouse_type, is_active FROM warehouses;

-- 3. Kiểm tra nguyên vật liệu
SELECT 'Materials:' as table_name;
SELECT id, material_code, material_name, unit, branch_id FROM materials LIMIT 10;

-- 4. Kiểm tra sản phẩm
SELECT 'Products:' as table_name;
SELECT id, product_code, product_name, unit, branch_id, is_active FROM products LIMIT 10;

-- 5. Kiểm tra tồn kho
SELECT 'Inventory Balances:' as table_name;
SELECT 
  ib.id,
  ib.warehouse_id,
  w.warehouse_name,
  COALESCE(m.material_code, p.product_code) as item_code,
  COALESCE(m.material_name, p.product_name) as item_name,
  ib.quantity
FROM inventory_balances ib
LEFT JOIN warehouses w ON w.id = ib.warehouse_id
LEFT JOIN materials m ON m.id = ib.material_id
LEFT JOIN products p ON p.id = ib.product_id
LIMIT 20;

-- 6. Kiểm tra user hiện tại
SELECT 'Users:' as table_name;
SELECT id, username, full_name, branch_id, role_id FROM users;

-- 7. Kiểm tra roles
SELECT 'Roles:' as table_name;
SELECT id, role_code, role_name FROM roles;
