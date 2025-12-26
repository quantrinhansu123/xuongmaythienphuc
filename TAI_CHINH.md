# Module Tài chính

## Tổng quan
Module tài chính giúp quản lý toàn bộ các giao dịch thu chi, tài khoản ngân hàng và công nợ của doanh nghiệp.

## Các chức năng chính

### 1. Phiếu thu (Receipts)
**Đường dẫn:** `/finance/receipts`

**Chức năng:**
- Ghi nhận các khoản thu tiền
- Phân loại theo danh mục thu
- Theo dõi tổng thu theo thời gian
- Lọc theo ngày

**Quy trình tạo phiếu thu:**
1. Nhấn nút "Tạo phiếu thu"
2. Chọn ngày thu và nhập số tiền
3. Chọn danh mục thu (bán hàng, thu nợ, lãi ngân hàng...)
4. Chọn phương thức: Tiền mặt hoặc Chuyển khoản
5. Nhập diễn giải
6. Lưu phiếu

**Mã phiếu tự động:** PT + YYMMDD + 0001 (VD: PT2411220001)

### 2. Phiếu chi (Payments)
**Đường dẫn:** `/finance/payments`

**Chức năng:**
- Ghi nhận các khoản chi tiền
- Phân loại theo danh mục chi
- Theo dõi tổng chi theo thời gian
- Lọc theo ngày

**Quy trình tạo phiếu chi:**
1. Nhấn nút "Tạo phiếu chi"
2. Chọn ngày chi và nhập số tiền
3. Chọn danh mục chi (mua NVL, lương, điện nước...)
4. Chọn phương thức: Tiền mặt hoặc Chuyển khoản
5. Nhập diễn giải
6. Lưu phiếu

**Mã phiếu tự động:** PC + YYMMDD + 0001 (VD: PC2411220001)

### 3. Luân chuyển quỹ (Transfers)
**Đường dẫn:** `/finance/transfers`

**Chức năng:**
- Chuyển tiền giữa các tài khoản ngân hàng
- Tự động tạo phiếu thu/chi tương ứng
- Cập nhật số dư tài khoản tự động

**Quy trình tạo phiếu thu/chi:**
1. Nhấn nút "Tạo phiếu thu/chi"
2. Chọn loại phiếu: Thu hoặc Chi
3. Chọn danh mục tài chính phù hợp
4. Nhập số tiền
5. Chọn phương thức thanh toán:
   - 💵 Tiền mặt: Giao dịch bằng tiền mặt
   - 🏦 Chuyển khoản: Giao dịch qua ngân hàng (cần chọn tài khoản)
   - 🔄 Chuyển quỹ: Chuyển tiền giữa các quỹ
6. Nhập diễn giải (tùy chọn)
7. Lưu phiếu

**Mã phiếu tự động:**
- Phiếu thu: PT + YYMMDD + 0001 (VD: PT2411220001)
- Phiếu chi: PC + YYMMDD + 0001 (VD: PC2411220001)

### 4. Công nợ nhà cung cấp (Supplier Debt)
**Đường dẫn:** `/finance/debt/suppliers`

**Chức năng:**
- Theo dõi công nợ phải trả cho nhà cung cấp
- Ghi nhận thanh toán công nợ NCC
- Xem lịch sử thanh toán
- Cảnh báo công nợ quá hạn

### 5. Công nợ khách hàng (Customer Debt)
**Đường dẫn:** `/finance/debt/customers`

**Chức năng:**
- Theo dõi công nợ phải thu từ khách hàng
- Theo dõi công nợ phải trả cho nhà cung cấp
- Ghi nhận thanh toán công nợ
- Cảnh báo công nợ quá hạn
- Xem lịch sử thanh toán

**Loại công nợ:**
- **RECEIVABLE (Phải thu):** Tiền khách hàng nợ công ty
- **PAYABLE (Phải trả):** Tiền công ty nợ nhà cung cấp

**Trạng thái công nợ:**
- **PENDING:** Chưa thanh toán
- **PARTIAL:** Đã thanh toán một phần
- **PAID:** Đã thanh toán đủ
- **OVERDUE:** Quá hạn thanh toán

**Quy trình thanh toán công nợ:**
1. Chọn công nợ cần thanh toán
2. Nhấn nút "Thanh toán"
3. Nhập số tiền thanh toán (tối đa = số nợ còn lại)
4. Chọn ngày thanh toán
5. Chọn phương thức thanh toán
6. Nhập ghi chú (tùy chọn)
7. Xác nhận thanh toán

**Tự động:**
- Khi thanh toán công nợ, hệ thống tự động:
  - Cập nhật số tiền đã thanh toán của đơn hàng
  - Cập nhật số dư tài khoản ngân hàng (nếu thanh toán qua ngân hàng)
  - Cập nhật trạng thái công nợ
  - Ghi nhận lịch sử thanh toán

**Lưu ý:**
- Thanh toán công nợ KHÔNG tự động tạo phiếu thu/chi trong sổ quỹ
- Sổ quỹ và công nợ là 2 hệ thống độc lập
- Nếu muốn ghi nhận vào sổ quỹ, cần tạo phiếu thu/chi riêng

### 6. Tài khoản ngân hàng (Bank Accounts)
**Đường dẫn:** `/finance/bank-accounts`

**Chức năng:**
- Quản lý danh sách tài khoản ngân hàng của công ty
- Theo dõi số dư từng tài khoản
- Tự động cập nhật số dư khi có giao dịch

**Thông tin tài khoản:**
- Tên ngân hàng
- Chi nhánh
- Số tài khoản
- Chủ tài khoản
- Số dư hiện tại

**Quy trình thêm tài khoản:**
1. Nhấn nút "Thêm tài khoản"
2. Nhập thông tin ngân hàng
3. Nhập số dư ban đầu
4. Lưu tài khoản

### 7. Danh mục tài chính (Financial Categories)
**Đường dẫn:** `/finance/categories`

**Chức năng:**
- Xem danh sách danh mục thu/chi
- Phân loại giao dịch theo mục đích

**Danh mục THU mặc định:**
- Thu tiền bán hàng
- Thu công nợ khách hàng
- Thu lãi ngân hàng
- Thu khác

**Danh mục CHI mặc định:**
- Chi mua nguyên vật liệu
- Chi trả công nợ nhà cung cấp
- Chi lương nhân viên
- Chi điện nước
- Chi thuê mặt bằng
- Chi vận chuyển
- Chi sửa chữa bảo trì
- Chi văn phòng phẩm
- Chi khác

### 8. Báo cáo tài chính (Finance Reports)
**Đường dẫn:** `/finance/reports`

**Chức năng:**
- Tổng quan thu chi trong kỳ
- Tình hình công nợ hiện tại
- Tổng số dư tài khoản ngân hàng
- Tính toán tài sản ròng
- Lọc theo khoảng thời gian

**Các chỉ số:**
- Tổng thu / Tổng chi / Chênh lệch
- Phải thu KH / Phải trả NCC
- Số dư ngân hàng
- Tài sản ròng = Số dư NH + Phải thu - Phải trả

## Cấu trúc Database

### Bảng financial_categories
```sql
- id: ID danh mục
- category_code: Mã danh mục (unique)
- category_name: Tên danh mục
- type: Loại (THU/CHI)
- description: Mô tả
- is_active: Trạng thái hoạt động
```

### Bảng bank_accounts
```sql
- id: ID tài khoản
- account_number: Số tài khoản
- account_holder: Chủ tài khoản
- bank_name: Tên ngân hàng
- branch_name: Chi nhánh
- balance: Số dư
- branch_id: Chi nhánh công ty
- is_active: Trạng thái hoạt động
```

### Bảng cash_books
```sql
- id: ID giao dịch
- transaction_code: Mã phiếu (unique)
- transaction_date: Ngày giao dịch
- financial_category_id: ID danh mục
- amount: Số tiền
- transaction_type: Loại (THU/CHI)
- payment_method: Phương thức (CASH/BANK/TRANSFER)
- bank_account_id: ID tài khoản ngân hàng
- reference_id: ID tham chiếu (đơn hàng, phiếu...)
- reference_type: Loại tham chiếu
- description: Diễn giải
- created_by: Người tạo
- branch_id: Chi nhánh
```

### Bảng debt_management
```sql
- id: ID công nợ
- debt_code: Mã công nợ (unique)
- customer_id: ID khách hàng (nếu phải thu)
- supplier_id: ID nhà cung cấp (nếu phải trả)
- debt_type: Loại (RECEIVABLE/PAYABLE)
- original_amount: Tổng nợ ban đầu
- remaining_amount: Số nợ còn lại
- due_date: Hạn thanh toán
- reference_id: ID tham chiếu
- reference_type: Loại tham chiếu
- status: Trạng thái (PENDING/PARTIAL/PAID/OVERDUE)
- notes: Ghi chú
```

### Bảng debt_payments
```sql
- id: ID thanh toán
- debt_id: ID công nợ
- payment_amount: Số tiền thanh toán
- payment_date: Ngày thanh toán
- payment_method: Phương thức
- bank_account_id: ID tài khoản ngân hàng
- notes: Ghi chú
- created_by: Người tạo
```

## API Endpoints

### Phiếu thu/chi
- `GET /api/finance/cash-book?dateFrom=&dateTo=` - Lấy danh sách giao dịch (lọc theo transactionType)
- `POST /api/finance/cash-book` - Tạo phiếu thu/chi

### Công nợ
- `GET /api/finance/debt?debtType=&status=` - Lấy danh sách công nợ
- `GET /api/finance/debt/[id]` - Xem chi tiết công nợ
- `POST /api/finance/debt` - Tạo công nợ mới
- `POST /api/finance/debt/[id]/payment` - Thanh toán công nợ

### Tài khoản ngân hàng
- `GET /api/finance/bank-accounts` - Lấy danh sách tài khoản
- `POST /api/finance/bank-accounts` - Thêm tài khoản
- `PUT /api/finance/bank-accounts/[id]` - Cập nhật tài khoản

### Danh mục tài chính
- `GET /api/finance/categories` - Lấy danh sách danh mục

## Quyền truy cập
Module tài chính sử dụng permission: `finance.cashbook` và `finance.debt`

**Các action:**
- `view`: Xem dữ liệu
- `create`: Tạo mới
- `edit`: Chỉnh sửa
- `delete`: Xóa

## Migration và Seed Data

### 1. Tạo bảng và cấu trúc
```bash
psql -U username -d database_name -f migrations/add_finance_module.sql
```

### 2. Seed dữ liệu mẫu
```bash
psql -U username -d database_name -f database/finance_seed_data.sql
```

Dữ liệu mẫu bao gồm:
- 13 danh mục tài chính (4 thu, 9 chi)
- 3 tài khoản ngân hàng
- 7 phiếu thu/chi mẫu
- 6 công nợ mẫu (3 phải thu, 3 phải trả)
- Lịch sử thanh toán mẫu

## Lưu ý
1. Tất cả giao dịch đều gắn với chi nhánh (branch_id)
2. Số dư tài khoản ngân hàng tự động cập nhật khi có giao dịch
3. Thanh toán công nợ tự động tạo phiếu thu/chi
4. Mã phiếu và mã công nợ được tạo tự động theo ngày
5. Hệ thống hỗ trợ đa chi nhánh, mỗi chi nhánh có sổ quỹ riêng
6. Luân chuyển quỹ tự động tạo 2 phiếu (1 chi + 1 thu)
7. Báo cáo tài chính tính theo khoảng thời gian, công nợ và số dư là số liệu hiện tại

## Cấu trúc Menu

```
💰 Tài chính
├── 📥 Phiếu thu (/finance/receipts)
├── 📤 Phiếu chi (/finance/payments)
├── 🔄 Luân chuyển quỹ (/finance/transfers)
├── 💳 Công nợ NCC (/finance/debt/suppliers)
├── 💰 Công nợ Khách hàng (/finance/debt/customers)
├── 🏦 Tài khoản ngân hàng (/finance/bank-accounts)
├── 📋 Danh mục tài chính (/finance/categories)
└── 📊 Báo cáo tài chính (/finance/reports)
```
