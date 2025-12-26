# HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO - POS SYSTEM

## TỔNG QUAN DỰ ÁN

Hệ thống quản lý tích hợp dành cho ngành may mặc, hỗ trợ đa chi nhánh với khả năng phân quyền dữ liệu chi tiết.

### Công nghệ sử dụng
- **Frontend**: Next.js 15 (React), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes / Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT / NextAuth.js
- **Deployment**: Vercel / VPS

---

## CẤU TRÚC HỆ THỐNG - 6 KHỐI CHỨC NĂNG

### 1. KHỐI QUẢN TRỊ HỆ THỐNG & PHÂN QUYỀN

**Mục đích**: Xương sống bảo mật, phân chia dữ liệu giữa các chi nhánh

**Chức năng chính**:
- Quản lý người dùng (Users)
- Quản lý vai trò & phân quyền (Roles & Permissions)
- Cấu hình công ty & chi nhánh (Company Config, Branches)
- Quản lý kho (Warehouses)
- Thiết lập in ấn (Print Templates)

**Đặc thù quan trọng**:
- **Data Segregation**: Mỗi chi nhánh chỉ thấy dữ liệu của mình
- Phân quyền chi tiết đến từng tính năng (View, Create, Edit, Delete)

**Bảng dữ liệu**:
- `branches` - Chi nhánh
- `warehouses` - Kho hàng
- `users` - Người dùng
- `roles` - Vai trò
- `permissions` - Quyền hạn
- `role_permissions` - Phân quyền chi tiết
- `company_config` - Cấu hình công ty

---

### 2. KHỐI QUẢN LÝ SẢN PHẨM & NGUYÊN VẬT LIỆU

**Mục đích**: Quản lý định danh hàng hóa và công thức sản xuất

**Chức năng chính**:
- Quản lý danh mục sản phẩm (Product Categories)
- Quản lý sản phẩm (Products)
- Quản lý nguyên vật liệu (Materials)
- Quản lý định mức nguyên liệu - BOM (Bill of Materials)
- Sao chép sản phẩm nhanh

**Đặc thù ngành may**:
- Định mức nguyên liệu: 1 sản phẩm = X mét vải + Y cúc + Z mét chỉ
- Tính giá vốn tự động từ BOM

**Bảng dữ liệu**:
- `product_categories` - Danh mục sản phẩm
- `products` - Sản phẩm
- `materials` - Nguyên vật liệu
- `bom` - Định mức nguyên liệu

---

### 3. KHỐI QUẢN LÝ KHO

**Mục đích**: Quản lý luân chuyển hàng hóa và kiểm soát tồn kho

**Chức năng chính**:
- Nhập kho (Import)
- Xuất kho (Export)
- Chuyển kho (Transfer)
- Kiểm kê tồn kho (Inventory Count)
- Báo cáo tồn kho theo kho/tổng hợp

**Quy trình 3 bước**:
1. **Đề xuất** - Tạo phiếu (Status: PENDING)
2. **Duyệt** - Người có quyền phê duyệt (Status: APPROVED)
3. **Thực tế** - Hoàn thành giao dịch (Status: COMPLETED)

**Bảng dữ liệu**:
- `inventory_transactions` - Phiếu kho
- `inventory_transaction_details` - Chi tiết phiếu kho
- `inventory_balances` - Tồn kho

---

### 4. KHỐI BÁN HÀNG & CRM

**Mục đích**: Quản lý đầu ra và quan hệ khách hàng

**Chức năng chính**:
- Quản lý nhóm khách hàng (Customer Groups)
- Quản lý khách hàng (Customers)
- Tạo đơn hàng (Orders)
- Chính sách giá linh hoạt theo nhóm khách
- Theo dõi lịch sử mua hàng

**Công thức giá**:
```
Giá bán = Giá vốn × Hệ số nhóm khách
```

**Ví dụ**:
- Khách lẻ: Hệ số 1.5 (Giá vốn 100k → Bán 150k)
- Khách sỉ: Hệ số 1.2 (Giá vốn 100k → Bán 120k)
- Khách VIP: Hệ số 1.1 (Giá vốn 100k → Bán 110k)

**Bảng dữ liệu**:
- `customer_groups` - Nhóm khách hàng
- `customers` - Khách hàng
- `orders` - Đơn hàng
- `order_details` - Chi tiết đơn hàng

---

### 5. KHỐI MUA HÀNG & NHÀ CUNG CẤP

**Mục đích**: Quản lý đầu vào nguyên vật liệu

**Chức năng chính**:
- Quản lý nhóm nhà cung cấp (Supplier Groups)
- Quản lý nhà cung cấp (Suppliers)
- Đặt mua nguyên vật liệu (Purchase Orders)
- Theo dõi tiến độ giao hàng
- Lịch sử mua hàng

**Quy trình**:
1. Tạo đơn đặt hàng (Status: PENDING)
2. Xác nhận đơn (Status: CONFIRMED)
3. Nhận hàng → Tạo phiếu nhập kho (Status: DELIVERED)

**Bảng dữ liệu**:
- `supplier_groups` - Nhóm nhà cung cấp
- `suppliers` - Nhà cung cấp
- `purchase_orders` - Đơn đặt hàng
- `purchase_order_details` - Chi tiết đơn đặt hàng

---

### 6. KHỐI TÀI CHÍNH & KẾ TOÁN

**Mục đích**: Quản lý dòng tiền và công nợ

**Chức năng chính**:
- Quản lý danh mục thu/chi (Financial Categories)
- Quản lý tài khoản ngân hàng (Bank Accounts)
- Sổ quỹ (Cash Books)
- Quản lý công nợ (Debt Management)
- Thanh toán công nợ (Debt Payments)
- Báo cáo tài chính

**Loại giao dịch**:
- Thu tiền từ khách hàng
- Chi tiền cho nhà cung cấp
- Thu/Chi khác (Lương, điện nước, v.v.)

**Bảng dữ liệu**:
- `financial_categories` - Danh mục thu/chi
- `bank_accounts` - Tài khoản ngân hàng
- `cash_books` - Sổ quỹ
- `debt_management` - Quản lý công nợ
- `debt_payments` - Thanh toán công nợ

---

## LUỒNG DỮ LIỆU CHÍNH

### Luồng Bán hàng
```
1. Tạo đơn hàng (orders) → Tính giá theo nhóm khách
2. Xuất kho (inventory_transactions) → Giảm tồn kho
3. Ghi nhận công nợ (debt_management) nếu chưa thanh toán
4. Thu tiền (cash_books) → Giảm công nợ
```

### Luồng Mua hàng
```
1. Tạo đơn đặt hàng (purchase_orders)
2. Nhận hàng → Nhập kho (inventory_transactions) → Tăng tồn kho
3. Ghi nhận công nợ (debt_management)
4. Thanh toán (cash_books) → Giảm công nợ
```

### Luồng Sản xuất (Nếu có)
```
1. Xuất nguyên vật liệu theo BOM
2. Nhập thành phẩm
3. Tính giá vốn thành phẩm từ NVL đã xuất
```

---

## BẢO MẬT & PHÂN QUYỀN

### Cơ chế Data Segregation
- Mỗi bản ghi có `branch_id`
- Query luôn filter theo `branch_id` của user
- Admin có thể xem toàn bộ

### Phân quyền chi tiết
```sql
role_permissions:
- can_view: Xem danh sách
- can_create: Tạo mới
- can_edit: Chỉnh sửa
- can_delete: Xóa
```

### Ví dụ phân quyền
- **Admin**: Full quyền tất cả module
- **Manager**: Full quyền trong chi nhánh
- **Staff**: Chỉ xem và tạo đơn hàng

---

## TÍNH NĂNG NỔI BẬT

### 1. Tính giá tự động
- Giá bán = Giá vốn × Hệ số nhóm khách
- Giá vốn tính từ BOM (tổng giá NVL)

### 2. Quản lý tồn kho thời gian thực
- Tồn riêng từng kho
- Tồn tổng toàn hệ thống
- Cảnh báo tồn kho thấp

### 3. Quy trình duyệt linh hoạt
- Đề xuất → Duyệt → Thực tế
- Lịch sử thay đổi trạng thái

### 4. Báo cáo đa dạng
- Báo cáo bán hàng theo thời gian/chi nhánh
- Báo cáo tồn kho
- Báo cáo công nợ
- Báo cáo thu chi

---

## YÊU CẦU KỸ THUẬT

### Database
- PostgreSQL 14+
- Indexes đã được tối ưu
- Triggers tự động cập nhật timestamp
- Foreign keys đảm bảo tính toàn vẹn

### Performance
- Pagination cho danh sách lớn
- Caching cho dữ liệu ít thay đổi
- Lazy loading cho chi tiết

### Security
- Password hashing (bcrypt)
- JWT authentication
- SQL injection prevention
- XSS protection
- CSRF protection

---

## KẾ HOẠCH TRIỂN KHAI

Xem file `KE_HOACH_PHAT_TRIEN.md` để biết chi tiết từng giai đoạn phát triển.
