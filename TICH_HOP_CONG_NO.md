# Hướng dẫn tích hợp Công nợ với Đơn hàng

## Tổng quan

Công nợ sẽ được tạo tự động từ:
- **Đơn hàng bán** (orders) → Công nợ phải thu từ khách hàng
- **Đơn đặt hàng mua** (purchase_orders) → Công nợ phải trả cho nhà cung cấp

## Cấu trúc dữ liệu mới

### 1. Bảng debt_management (đã cập nhật)
```sql
- original_amount: Tổng tiền đơn hàng
- deposit_amount: Tiền cọc (nếu có)
- paid_amount: Tổng tiền đã thanh toán (không bao gồm cọc)
- remaining_amount: Còn phải trả = original_amount - deposit_amount - paid_amount
- reference_id: ID của đơn hàng (order_id hoặc purchase_order_id)
- reference_type: 'ORDER' hoặc 'PURCHASE_ORDER'
```

### 2. Bảng orders (cần thêm)
```sql
- deposit_amount: Tiền cọc khách đặt
- paid_amount: Tiền đã thanh toán
- payment_status: 'UNPAID', 'PARTIAL', 'PAID'
```

### 3. Bảng purchase_orders (cần thêm)
```sql
- deposit_amount: Tiền cọc đã đặt cho NCC
- paid_amount: Tiền đã thanh toán cho NCC
- payment_status: 'UNPAID', 'PARTIAL', 'PAID'
```

## Quy trình tạo công nợ tự động

### Khi tạo đơn hàng bán (Order)

1. **Tạo đơn hàng** với thông tin:
   - Khách hàng
   - Sản phẩm và số lượng
   - Tổng tiền (final_amount)
   - Tiền cọc (deposit_amount) - nếu có
   - Hạn thanh toán (due_date)

2. **Tự động tạo công nợ** nếu chưa thanh toán đủ:
   ```javascript
   if (deposit_amount < final_amount) {
     // Tạo công nợ
     const debtAmount = final_amount - deposit_amount;
     
     INSERT INTO debt_management (
       debt_code,
       customer_id,
       debt_type,
       original_amount,
       deposit_amount,
       paid_amount,
       remaining_amount,
       due_date,
       reference_id,
       reference_type,
       status
     ) VALUES (
       'CN' + orderCode,
       customerId,
       'RECEIVABLE',
       final_amount,
       deposit_amount,
       0,
       debtAmount,
       due_date,
       order_id,
       'ORDER',
       'PENDING'
     );
   }
   ```

3. **Cập nhật trạng thái đơn hàng**:
   - `deposit_amount = 0` và `paid_amount = 0` → `payment_status = 'UNPAID'`
   - `deposit_amount + paid_amount < final_amount` → `payment_status = 'PARTIAL'`
   - `deposit_amount + paid_amount >= final_amount` → `payment_status = 'PAID'`

### Khi thanh toán công nợ

1. **Khách hàng thanh toán**:
   ```javascript
   // Cập nhật orders
   UPDATE orders 
   SET 
     paid_amount = paid_amount + payment_amount,
     payment_status = CASE 
       WHEN deposit_amount + paid_amount + payment_amount >= final_amount THEN 'PAID'
       ELSE 'PARTIAL'
     END
   WHERE id = reference_id;
   ```

2. **Cập nhật số dư ngân hàng** (nếu thanh toán qua ngân hàng)
   ```javascript
   UPDATE bank_accounts 
   SET balance = balance + payment_amount  // Hoặc - nếu là trả nợ NCC
   WHERE id = bank_account_id;
   ```

**Lưu ý quan trọng:**
- Thanh toán công nợ KHÔNG tự động tạo phiếu thu/chi trong sổ quỹ
- Công nợ và sổ quỹ là 2 hệ thống độc lập
- Công nợ chỉ tính dựa trên đơn hàng và thanh toán của đơn hàng
- Nếu muốn ghi nhận vào sổ quỹ, cần tạo phiếu thu/chi riêng

### Khi tạo đơn đặt hàng mua (Purchase Order)

Tương tự như đơn hàng bán, nhưng:
- `debt_type = 'PAYABLE'`
- `reference_type = 'PURCHASE_ORDER'`
- Liên kết với `supplier_id`

## Giao diện người dùng

### Trang Đơn hàng bán

Thêm các trường:
- **Tiền cọc**: Input số tiền cọc khách đặt
- **Hạn thanh toán**: Date picker
- **Trạng thái thanh toán**: Badge hiển thị UNPAID/PARTIAL/PAID

### Trang Công nợ

Hiển thị:
- **Mã công nợ**: Link đến đơn hàng gốc
- **Khách hàng/NCC**: Tên và mã
- **Tổng tiền**: Tổng tiền đơn hàng
- **Tiền cọc**: Số tiền đã cọc
- **Đã trả**: Tổng tiền đã thanh toán
- **Còn lại**: Số tiền còn phải thu/trả
- **Hạn thanh toán**: Ngày đến hạn
- **Trạng thái**: PENDING/PARTIAL/PAID/OVERDUE

### Side Panel Chi tiết công nợ

Hiển thị:
1. **Thông tin đơn hàng gốc**:
   - Mã đơn hàng (link)
   - Ngày đơn hàng
   - Tổng tiền
   - Tiền cọc
   - Đã trả
   - Còn lại
   - Hạn thanh toán

2. **Form thanh toán**:
   - Số tiền thanh toán (max = remaining_amount)
   - Ngày thanh toán
   - Phương thức (Tiền mặt/Ngân hàng/Chuyển khoản)
   - Tài khoản ngân hàng (nếu chọn Ngân hàng/CK)
   - Ghi chú

3. **Lịch sử thanh toán**:
   - Danh sách các lần thanh toán
   - Số tiền, ngày, phương thức
   - Người tạo

4. **Thông tin khách hàng/NCC**:
   - Tên, mã, SĐT
   - Tổng công nợ hiện tại
   - Danh sách công nợ khác

## Ví dụ thực tế

### Ví dụ 1: Đơn hàng có cọc

```
Đơn hàng DH001:
- Tổng tiền: 10,000,000 đ
- Tiền cọc: 3,000,000 đ
- Hạn thanh toán: 30 ngày

→ Tạo công nợ CN-DH001:
  - original_amount: 10,000,000
  - deposit_amount: 3,000,000
  - paid_amount: 0
  - remaining_amount: 7,000,000
  - status: PENDING

Khách thanh toán lần 1: 4,000,000 đ
→ Cập nhật:
  - paid_amount: 4,000,000
  - remaining_amount: 3,000,000
  - status: PARTIAL

Khách thanh toán lần 2: 3,000,000 đ
→ Cập nhật:
  - paid_amount: 7,000,000
  - remaining_amount: 0
  - status: PAID
```

### Ví dụ 2: Đơn hàng không cọc

```
Đơn hàng DH002:
- Tổng tiền: 5,000,000 đ
- Tiền cọc: 0 đ
- Hạn thanh toán: 15 ngày

→ Tạo công nợ CN-DH002:
  - original_amount: 5,000,000
  - deposit_amount: 0
  - paid_amount: 0
  - remaining_amount: 5,000,000
  - status: PENDING
```

## Các API cần cập nhật

### 1. POST /api/sales/orders
Thêm logic tạo công nợ tự động sau khi tạo đơn hàng thành công.

### 2. POST /api/purchasing/orders
Thêm logic tạo công nợ tự động sau khi tạo đơn mua thành công.

### 3. POST /api/finance/debts/[id]/payments
Đã có - cập nhật để sync với orders/purchase_orders.

### 4. GET /api/finance/debts
Thêm thông tin từ orders/purchase_orders khi query.

## Migration cần chạy

1. Chạy file `migrations/update_debt_management.sql` để:
   - Thêm cột `deposit_amount` và `paid_amount` vào `debt_management`
   - Thêm cột thanh toán vào `orders` và `purchase_orders`
   - Tạo trigger tự động cập nhật `remaining_amount`

2. Cập nhật dữ liệu cũ (nếu có):
   ```sql
   -- Cập nhật paid_amount từ remaining_amount
   UPDATE debt_management 
   SET paid_amount = original_amount - remaining_amount
   WHERE paid_amount = 0;
   ```

## Lưu ý quan trọng

1. **Trigger tự động**: Khi thêm payment vào `debt_payments`, trigger sẽ tự động cập nhật `debt_management`

2. **Đồng bộ 2 chiều**: 
   - Thanh toán công nợ → Cập nhật đơn hàng
   - Cập nhật đơn hàng → Cập nhật công nợ

3. **Xóa đơn hàng**: Nếu xóa đơn hàng, cần xóa công nợ liên quan (hoặc set reference_id = NULL)

4. **Hủy đơn hàng**: Nếu hủy đơn hàng, cần cập nhật trạng thái công nợ thành CANCELLED

5. **Quyền hạn**: 
   - Tạo đơn hàng → Tự động tạo công nợ (không cần quyền finance.debts)
   - Thanh toán công nợ → Cần quyền finance.debts.edit
