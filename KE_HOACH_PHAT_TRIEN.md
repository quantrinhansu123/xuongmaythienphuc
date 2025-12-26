# KẾ HOẠCH PHÁT TRIỂN HỆ THỐNG POS

## TỔNG QUAN

**Thời gian dự kiến**: 12-16 tuần  
**Phương pháp**: Agile - Phát triển theo Sprint 2 tuần  
**Ưu tiên**: MVP (Minimum Viable Product) trước, mở rộng sau

---

## GIAI ĐOẠN 1: SETUP & FOUNDATION (Tuần 1-2)

### Sprint 1: Khởi tạo dự án

#### Công việc
- [x] Setup Next.js project với TypeScript
- [ ] Cấu hình Tailwind CSS
- [ ] Setup PostgreSQL database
- [ ] Chạy migration script tạo tables
- [ ] Setup biến môi trường (.env)
- [ ] Cấu hình ESLint & Prettier

#### Database Setup
```bash
# Tạo database
psql -U postgres
CREATE DATABASE pos_system;

# Chạy migration script
psql -U postgres -d pos_system -f database/schema.sql
```

#### Deliverables
- Project structure hoàn chỉnh
- Database schema đã tạo
- Development environment sẵn sàng

---

## GIAI ĐOẠN 2: AUTHENTICATION & ADMIN (Tuần 3-4)

### Sprint 2: Hệ thống đăng nhập & phân quyền

#### Công việc Backend
- [ ] API đăng nhập/đăng xuất
- [ ] Middleware kiểm tra authentication
- [ ] Middleware kiểm tra permissions
- [ ] API quản lý users
- [ ] API quản lý roles & permissions

#### Công việc Frontend
- [ ] Trang đăng nhập
- [ ] Layout admin với sidebar/navbar
- [ ] Protected routes
- [ ] Quản lý users (CRUD)
- [ ] Quản lý roles & permissions
- [ ] Phân quyền UI (ẩn/hiện theo quyền)

#### Deliverables
- Đăng nhập/đăng xuất hoạt động
- Phân quyền cơ bản hoàn chỉnh
- Admin có thể quản lý users

---

## GIAI ĐOẠN 3: MASTER DATA (Tuần 5-6)

### Sprint 3: Dữ liệu nền tảng

#### Công việc Backend
- [ ] API quản lý chi nhánh (Branches)
- [ ] API quản lý kho (Warehouses)
- [ ] API quản lý danh mục sản phẩm (Categories)
- [ ] API quản lý sản phẩm (Products)
- [ ] API quản lý nguyên vật liệu (Materials)
- [ ] API quản lý BOM
- [ ] API quản lý nhóm khách hàng (Customer Groups)
- [ ] API quản lý khách hàng (Customers)
- [ ] API quản lý nhà cung cấp (Suppliers)

#### Công việc Frontend
- [ ] Trang quản lý chi nhánh
- [ ] Trang quản lý kho
- [ ] Trang quản lý danh mục sản phẩm
- [ ] Trang quản lý sản phẩm (với BOM)
- [ ] Trang quản lý nguyên vật liệu
- [ ] Trang quản lý khách hàng
- [ ] Trang quản lý nhà cung cấp
- [ ] Form components tái sử dụng

#### Deliverables
- Tất cả master data có thể CRUD
- Data segregation theo branch hoạt động
- UI/UX nhất quán

---

## GIAI ĐOẠN 4: INVENTORY MANAGEMENT (Tuần 7-8)

### Sprint 4: Quản lý kho

#### Công việc Backend
- [ ] API tạo phiếu nhập kho
- [ ] API tạo phiếu xuất kho
- [ ] API tạo phiếu chuyển kho
- [ ] API duyệt phiếu kho
- [ ] Logic cập nhật tồn kho (inventory_balances)
- [ ] API xem tồn kho theo kho
- [ ] API xem tồn kho tổng hợp
- [ ] Validation số lượng tồn kho

#### Công việc Frontend
- [ ] Trang tạo phiếu nhập kho
- [ ] Trang tạo phiếu xuất kho
- [ ] Trang tạo phiếu chuyển kho
- [ ] Trang duyệt phiếu kho
- [ ] Trang xem tồn kho
- [ ] Báo cáo xuất nhập tồn
- [ ] In phiếu kho

#### Deliverables
- Quy trình nhập/xuất/chuyển kho hoàn chỉnh
- Tồn kho cập nhật real-time
- Báo cáo tồn kho chính xác

---

## GIAI ĐOẠN 5: SALES MODULE (Tuần 9-10)

### Sprint 5: Bán hàng

#### Công việc Backend
- [ ] API tạo đơn hàng
- [ ] Logic tính giá theo nhóm khách (price_multiplier)
- [ ] API cập nhật trạng thái đơn hàng
- [ ] Tự động tạo phiếu xuất kho khi đơn hàng confirmed
- [ ] Tự động tạo công nợ nếu chưa thanh toán đủ
- [ ] API xem lịch sử đơn hàng
- [ ] API báo cáo bán hàng

#### Công việc Frontend
- [ ] Trang tạo đơn hàng (POS interface)
- [ ] Chọn khách hàng → Tự động load giá
- [ ] Thêm sản phẩm vào đơn
- [ ] Tính tổng tiền, chiết khấu
- [ ] Xác nhận đơn hàng
- [ ] In hóa đơn
- [ ] Trang quản lý đơn hàng
- [ ] Báo cáo bán hàng

#### Deliverables
- Quy trình bán hàng hoàn chỉnh
- Tính giá tự động theo nhóm khách
- In hóa đơn đẹp

---

## GIAI ĐOẠN 6: PURCHASING MODULE (Tuần 11-12)

### Sprint 6: Mua hàng

#### Công việc Backend
- [ ] API tạo đơn đặt hàng (Purchase Orders)
- [ ] API cập nhật trạng thái đơn đặt hàng
- [ ] Tự động tạo phiếu nhập kho khi nhận hàng
- [ ] Tự động tạo công nợ phải trả
- [ ] API xem lịch sử đặt hàng
- [ ] API báo cáo mua hàng

#### Công việc Frontend
- [ ] Trang tạo đơn đặt hàng
- [ ] Chọn nhà cung cấp
- [ ] Thêm nguyên vật liệu vào đơn
- [ ] Xác nhận đơn đặt hàng
- [ ] Nhận hàng → Tạo phiếu nhập
- [ ] Trang quản lý đơn đặt hàng
- [ ] Báo cáo mua hàng

#### Deliverables
- Quy trình mua hàng hoàn chỉnh
- Liên kết với nhập kho tự động
- Báo cáo mua hàng

---

## GIAI ĐOẠN 7: FINANCE MODULE (Tuần 13-14)

### Sprint 7: Tài chính & Công nợ

#### Công việc Backend
- [ ] API quản lý danh mục thu/chi
- [ ] API quản lý tài khoản ngân hàng
- [ ] API ghi sổ quỹ (Cash Books)
- [ ] API xem công nợ phải thu
- [ ] API xem công nợ phải trả
- [ ] API thanh toán công nợ
- [ ] Logic cập nhật số dư công nợ
- [ ] API báo cáo thu chi
- [ ] API báo cáo công nợ

#### Công việc Frontend
- [ ] Trang quản lý danh mục thu/chi
- [ ] Trang quản lý tài khoản ngân hàng
- [ ] Trang ghi sổ quỹ
- [ ] Trang xem công nợ phải thu
- [ ] Trang xem công nợ phải trả
- [ ] Trang thanh toán công nợ
- [ ] Báo cáo thu chi
- [ ] Báo cáo công nợ
- [ ] Dashboard tài chính

#### Deliverables
- Quản lý thu chi hoàn chỉnh
- Theo dõi công nợ chính xác
- Báo cáo tài chính đầy đủ

---

## GIAI ĐOẠN 8: REPORTING & OPTIMIZATION (Tuần 15-16)

### Sprint 8: Báo cáo & Tối ưu

#### Công việc Backend
- [ ] Tối ưu queries (indexes, explain analyze)
- [ ] Caching cho master data
- [ ] API export Excel/PDF
- [ ] API dashboard tổng quan
- [ ] Background jobs cho báo cáo nặng

#### Công việc Frontend
- [ ] Dashboard tổng quan (charts)
- [ ] Báo cáo tổng hợp bán hàng
- [ ] Báo cáo tổng hợp mua hàng
- [ ] Báo cáo tồn kho chi tiết
- [ ] Báo cáo lợi nhuận
- [ ] Export Excel/PDF
- [ ] Responsive design
- [ ] Performance optimization

#### Deliverables
- Dashboard đẹp với charts
- Báo cáo đầy đủ, export được
- Performance tốt
- Responsive trên mobile

---

## GIAI ĐOẠN 9: TESTING & DEPLOYMENT (Tuần 17-18)

### Sprint 9: Testing & Go-live

#### Công việc
- [ ] Unit tests cho critical functions
- [ ] Integration tests cho API
- [ ] E2E tests cho user flows
- [ ] Load testing
- [ ] Security audit
- [ ] Bug fixes
- [ ] User documentation
- [ ] Admin documentation
- [ ] Deployment to production
- [ ] Training users

#### Deliverables
- Hệ thống stable, tested
- Documentation đầy đủ
- Production ready
- Users được training

---

## TECH STACK CHI TIẾT

### Frontend
```
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui (Component library)
- React Hook Form (Form handling)
- Zod (Validation)
- TanStack Query (Data fetching)
- Zustand (State management)
- Recharts (Charts)
- React-to-print (Printing)
```

### Backend
```
- Next.js API Routes
- Prisma ORM (hoặc raw SQL)
- PostgreSQL
- JWT (Authentication)
- Bcrypt (Password hashing)
```

### DevOps
```
- Git (Version control)
- Docker (Containerization)
- Vercel / VPS (Deployment)
- PM2 (Process manager)
- Nginx (Reverse proxy)
```

---

## CẤU TRÚC THỨ MỤC ĐỀ XUẤT

```
pos-system/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Dashboard)
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── branches/
│   │   │   └── warehouses/
│   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── materials/
│   │   │   └── bom/
│   │   ├── inventory/
│   │   │   ├── import/
│   │   │   ├── export/
│   │   │   ├── transfer/
│   │   │   └── balance/
│   │   ├── sales/
│   │   │   ├── customers/
│   │   │   ├── orders/
│   │   │   └── reports/
│   │   ├── purchasing/
│   │   │   ├── suppliers/
│   │   │   ├── purchase-orders/
│   │   │   └── reports/
│   │   └── finance/
│   │       ├── cash-books/
│   │       ├── debts/
│   │       └── reports/
│   └── api/
│       ├── auth/
│       ├── admin/
│       ├── products/
│       ├── inventory/
│       ├── sales/
│       ├── purchasing/
│       └── finance/
├── components/
│   ├── ui/ (Shadcn components)
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   └── layouts/
├── lib/
│   ├── db.ts (Database connection)
│   ├── auth.ts (Auth utilities)
│   ├── permissions.ts (Permission checks)
│   └── utils.ts
├── types/
│   └── index.ts (TypeScript types)
├── hooks/
│   └── use-*.ts (Custom hooks)
├── database/
│   └── schema.sql
├── public/
├── .env.local
└── package.json
```

---

## CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Xác nhận yêu cầu chi tiết với khách hàng
- [ ] Chuẩn bị môi trường development
- [ ] Setup Git repository
- [ ] Tạo database PostgreSQL
- [ ] Cài đặt dependencies
- [ ] Thiết lập coding standards
- [ ] Tạo project board (Trello/Jira)

---

## RỦI RO & GIẢI PHÁP

### Rủi ro 1: Phân quyền dữ liệu phức tạp
**Giải pháp**: Tạo middleware kiểm tra branch_id ở mọi query

### Rủi ro 2: Tồn kho không chính xác
**Giải pháp**: Sử dụng database transactions, validation chặt chẽ

### Rủi ro 3: Performance với dữ liệu lớn
**Giải pháp**: Indexes, pagination, caching, lazy loading

### Rủi ro 4: Thay đổi yêu cầu giữa chừng
**Giải pháp**: Agile methodology, sprint review thường xuyên

---

## KẾT LUẬN

Kế hoạch này ưu tiên phát triển MVP trước (Giai đoạn 1-7), sau đó mở rộng tính năng.

Mỗi sprint có deliverables rõ ràng, có thể demo cho khách hàng.

Thời gian có thể điều chỉnh tùy team size và kinh nghiệm.
