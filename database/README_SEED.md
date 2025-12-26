# Hướng dẫn Seed Data cho Database

## Thứ tự chạy các file seed

Để tạo dữ liệu mẫu cho hệ thống, chạy các file SQL theo thứ tự sau:

### 1. Schema và dữ liệu cơ bản
```bash
psql -U postgres -d your_database < database/schema.sql
```

### 2. Permissions và phân quyền
```bash
psql -U postgres -d your_database < database/quick_seed_permissions.sql
```

### 3. Users mẫu
```bash
psql -U postgres -d your_database < database/seed.sql
```

### 4. Dữ liệu inventory (kho, sản phẩm, NVL, tồn kho)
```bash
psql -U postgres -d your_database < database/inventory_seed_sample.sql
```

### 5. Dữ liệu tài chính (tùy chọn)
```bash
psql -U postgres -d your_database < database/finance_seed_data.sql
```

## Dữ liệu mẫu được tạo

### Inventory Seed Sample bao gồm:

**Kho:**
- KHO_NVL_01: Kho nguyên vật liệu CN1
- KHO_TP_01: Kho thành phẩm CN1

**Nguyên vật liệu:**
- NVL_VAI_001: Vải cotton trắng (500 mét)
- NVL_VAI_002: Vải kaki xanh (300 mét)
- NVL_CUC_001: Cúc áo 10mm (50 hộp)
- NVL_CHI_001: Chỉ may trắng (100 ống)
- NVL_CHI_002: Chỉ may đen (80 ống)

**Sản phẩm:**
- SP_AO_001: Áo sơ mi trắng nam (100 cái)
- SP_AO_002: Áo thun cotton nữ (150 cái)
- SP_QUAN_001: Quần kaki nam (80 cái)
- SP_QUAN_002: Quần jean nữ (120 cái)

**BOM (Bill of Materials):**
- Định mức nguyên liệu cho từng sản phẩm

## Kiểm tra dữ liệu

Sau khi chạy seed, kiểm tra dữ liệu:

```sql
-- Kiểm tra kho
SELECT * FROM warehouses;

-- Kiểm tra tồn kho NVL
SELECT w.warehouse_name, m.material_name, ib.quantity, m.unit
FROM inventory_balances ib
JOIN warehouses w ON w.id = ib.warehouse_id
JOIN materials m ON m.id = ib.material_id;

-- Kiểm tra tồn kho thành phẩm
SELECT w.warehouse_name, p.product_name, ib.quantity, p.unit
FROM inventory_balances ib
JOIN warehouses w ON w.id = ib.warehouse_id
JOIN products p ON p.id = ib.product_id;
```

## Lưu ý

- Tất cả dữ liệu mẫu thuộc chi nhánh có ID = 1
- User admin có thể xem tất cả kho
- User thường chỉ xem kho thuộc chi nhánh của mình
- Kho NVL chỉ chứa nguyên vật liệu
- Kho thành phẩm chỉ chứa sản phẩm
