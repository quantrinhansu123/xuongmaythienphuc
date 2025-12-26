# 1. **General Framework Rules**

1. **Do NOT wrap any component or page with `<App>` from Ant Design.** The
   global wrapper is already provided in: `src/providers/AppThemeProvider.tsx`

2. **Do NOT use static AntD APIs**, including:

   - `message.success()`
   - `notification.error()`
   - `Modal.confirm()`
   - or any other static call.

3. Copilot must always use:

```tsx
"use client";
import { App } from "antd";
const { message, notification, modal } = App.useApp();
```

4. All AntD components used inside the App Router must be **client components**.

5. Only use **AntD v6 APIs**. No deprecated props or legacy components.

6. Never import or generate:

```
@ant-design/nextjs-registry
```

7. All styling and UI must follow theme tokens defined in:

```
src/providers/AppThemeProvider.tsx
```

8. New pages must follow the layout and structural style of:

```
src/app/(dashboard)/admin/users/page.tsx
```

9. Always use existing shared components whenever possible (e.g., `CommonTable`,
   `FilterList`, form components, layout wrappers).

---

# 2. **Next.js App Router Rules**

1. Every file that uses AntD, filters, TanStack Query, or client-side UI must
   start with `"use client"`.
2. Do NOT manually push filter parameters into the URL unless explicitly
   required.
3. Routing and dialogs must follow the App Router conventions only.

---

# 3. **TanStack Query Rules (Mandatory)**

All data fetching must use TanStack Query.

### Fetching example:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["customers", query],
  queryFn: () => api.customers.list(query),
});
```

### Mutation example:

```tsx
const mutation = useMutation({
  mutationFn: api.customers.update,
  onSuccess() {
    message.success("Updated successfully");
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  },
});
```

Forbidden:

- `fetch()` inside component bodies
- SWR
- Axios directly in UI files
- React Query v3 syntax

---

# 4. **Global Filtering Rules (`useFilter`)**

Copilot must always use **the existing filtering system**:

```
src/hooks/useFilter.ts
```

Copilot may NOT rewrite or replace any part of the filtering logic.

### Required imports:

```tsx
const {
  query,
  pagination,
  updateQuery,
  updateQueries,
  reset,
  applyFilter,
  handlePageChange,
} = useFilter();
```

### Required behaviors:

- `updateQuery(key, value)` for single-filter updates
- `updateQueries([{ key, value }])` for batch updates
- `reset()` to clear filters
- `handlePageChange(page, pageSize)` for pagination
- `applyFilter(data)` for client-side filtering

Forbidden:

- Manual `.filter()` logic
- Custom filter state
- Custom search logic
- Custom pagination code
- Adding debounce manually

---

# 6. **WrapperContent Rules (MANDATORY)**

All search, filtering, refreshing, column settings, and mobile option UI **must
be rendered exclusively via**:

```
src/components/WrapperContent.tsx
```

Copilot must NEVER implement custom UI for:

- Search input
- Filter forms
- Filter modals
- Reset filter buttons
- Column visibility settings
- Mobile options menu
- Reload button

### Required WrapperContent structure:

```tsx
<WrapperContent
  title="Customers"
  header={{
    buttonBackTo: "/dashboard",
    searchInput: {
      placeholder: "Search customers",
      filterKeys: ["name", "email"],
    },
    filters: {
      fields: FILTER_FIELDS,
      query,
      onApplyFilter: updateQueries,
      onReset: reset,
    },
    columnSettings: {
      columns: columnSettings,
      onChange: setColumnSettings,
      onReset: resetColumnSettings,
    },
    refetchDataWithKeys: ["customers"],
  }}
  isLoading={customersLoading}
  isRefetching={customersRefetching}
  isNotAccessible={false}
  isEmpty={!customers?.length}
>
```

WrapperContent handles:

- Desktop inline filters
- Mobile filter modal
- Search debounce
- Column settings popover
- Reset button
- Data refetch
- Empty state
- Permission denied state

Copilot must **not** rebuild these.

---

# 7. **Table Rules (STRICT)**

Copilot must follow these rules when generating AntD tables:

### Required column properties:

- `title`
- `dataIndex`
- `key`
- **`width` is required**
- `align`
- optional: `render`

### Fixed columns (mandatory):

- **First TWO columns:** `fixed: "left"`
- **Last TWO columns:** `fixed: "right"`

### Numeric fields:

```ts
align: "left";
```

### Table component must include:

```tsx
<Table columns={columns} dataSource={data} scroll={{ x: true }} bordered />
```

Forbidden:

- Columns without width
- No fixed columns
- Tables without scroll
- Custom manual table components

---

---

# 8. **Reporting / Analytics Rules**

- Use AntD `Statistic` for KPIs.
- Use **Recharts** for charts.
- Chart colors must follow AntD theme tokens.
- Layout must follow existing dashboard/report styling.

---

# 9. **Forbidden Patterns (Global)**

Copilot must NEVER generate:

- Static AntD APIs
- Deprecated AntD props
- fetch() in components
- Custom filtering logic
- Custom pagination
- Manual query string building
- URL appending filters manually
- Tables without width
- Tables without fixed first and last columns
- Filter UI outside WrapperContent
- Layouts inconsistent with Admin Users page
- Theme overrides outside AppThemeProvider
- Custom column setting UI

---

# 10. **QueryKey Normalization Rule (TanStack Query)**

- Use AntD `Statistic` for KPIs.
- Use **Recharts** for charts.
- Chart colors must follow AntD theme tokens.
- Layout must follow existing dashboard/report styling.

---

# 10. **Forbidden Patterns (Global)**

Copilot must NEVER generate:

- Static AntD APIs
- Deprecated AntD props
- fetch() in components
- Custom filtering logic
- Custom pagination
- Manual query string building
- URL appending filters manually
- Tables without width
- Tables without fixed first and last columns
- Filter UI outside WrapperContent
- Layouts inconsistent with Admin Users page
- Theme overrides outside AppThemeProvider
- Custom column setting UI

# **11. QueryKey Normalization Rule (TanStack Query)**

Copilot must **never** use raw objects inside `queryKey`. Objects break
referential stability and cause infinite refetch loops. Instead, all filter
parameters must be converted into a **stable primitive** before being used in
the `queryKey`.

### ❌ Forbidden

```ts
useQuery({
  queryKey: ["debts-summary", query], // DO NOT PUT OBJECTS IN QUERY KEY
  queryFn: async () => { ... },
});
```

### ✔ Required

```ts
useQuery({
  queryKey: ["debts-summary", SuperJSON.stringify(query)],
  queryFn: async () => {
    const res = await fetch(`/api/reports/debts?type=summary&${qs}`);
    const body = await res.json();
    return body.success ? body.data : null;
  },
});
```

### ✔ Extended requirements

- Always serialize filter params to a stable primitive:

  - `SuperJSON.stringify(query)` (preferred)
  - `JSON.stringify(query)` (fallback)

- Never place nested objects, arrays, or spread objects into the query key.

- If multiple query groups exist, Copilot must combine them as:

  ```ts
  queryKey: [
    "report-customer",
    Object.values(customerQuery).join(","),
    Object.values(dateQuery).join(","),
  ];
  ```

- When using `useFilter`, the query key must depend **only** on `filter.query`
  after being serialized.

# **12. Multi-Value Query Parameter Rule (Comma-Separated Params)**

Whenever the client sends any query parameter whose value contains **commas**,
Copilot must treat this as **multiple values for filtering**, not a single
string. The API must always detect this pattern and convert it into an array
before performing database queries.

---

## ✔ Required API Behavior

Whenever a query param contains a comma:

```ts
?status=active,inactive
?branchId=1,2,3
?category=shoes,hats
```

The API **must always**:

1. **Split the value by comma**
2. **Trim whitespace**
3. **Filter out empty values**
4. **Use array filtering logic in Prisma/SQL**

### Required server-side helper:

```ts
function parseMultiValue(param?: string | string[]) {
  if (!param) return [];

  if (Array.isArray(param)) {
    return param
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return param
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
```

### Required usage inside API route:

```ts
const statuses = parseMultiValue(searchParams.status);

const data = await db.orders.findMany({
  where: statuses.length > 0 ? { status: { in: statuses } } : {},
});
```

---

## ❌ Forbidden

Copilot must **not** treat comma-separated string as a single raw value:

```ts
// NEVER do this
const status = req.query.status; // "active,inactive"
db.orders.findMany({ where: { status } });
```

This produces incorrect results.

---

## ✔ Required Client Behavior

Copilot must always serialize multi-select filters as comma-separated strings:

```ts
SuperJSON.stringify(query);
```

Examples:

```ts
filter.query = {
  status: ["active", "inactive"],      // client state
}

// must serialize to:
?status=active,inactive
```

---

## ✔ Required Rule Summary for Copilot

**If a query parameter contains commas, it must be parsed as multiple tokens on
the server. If a filter contains multiple values, the client must serialize it
using commas. Every API endpoint must check for commas and split them into an
array before querying.**

# **13. Statistic Style Rule (Ant Design v6 Only)**

Copilot must **never** use deprecated styling props from Ant Design v4/v5 when
generating `<Statistic />` components.

### ❌ Forbidden (v4/v5 APIs)

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  valueStyle={{ color: "#cf1322" }} // ❌ DO NOT USE valueStyle
/>
```

- `valueStyle`, `titleStyle`, `prefixStyle`, and `suffixStyle` are **removed**
  in AntD v6.
- Copilot must not generate these props under any circumstance.

---

## ✔ Required (Ant Design v6)

Copilot must always use the **new `styles` API** introduced in Ant Design v6:

```tsx
<Statistic
  title="Overdue Debts"
  value={summary?.overdueDebts || 0}
  prefix={<ExclamationCircleOutlined />}
  styles={{
    content: { color: "#cf1322" },
  }}
/>
```

### ✔ Notes for Copilot

- All custom styling for Statistic must use `styles={{ ... }}` (AntD v6
  pattern).
- `content` controls the number/value color.
- Every style-related change must follow the new v6 structure.

---

## ✔ Extended Requirements

Copilot must follow these constraints:

- Use:

  ```ts
  styles={{
    content: { ... },
    title: { ... },
    prefix: { ... },
    suffix: { ... },
  }}
  ```

  when necessary.

- **Never generate**:

  - `valueStyle`
  - `titleStyle`
  - `prefixStyle`
  - `suffixStyle`

- All Statistic components **must use the v6 API exclusively**.

# **14. Backend-Filtered Data Rule (Do NOT Re-filter on Client)**

When data has **already been filtered by the backend**, Copilot must **never**
apply any additional client-side filtering using `applyFilter()`.

`applyFilter()` is only allowed for **purely client-side data**, not for data
returned from API endpoints.

---

### ❌ Forbidden

```ts
// Data already filtered by backend
const data = await fetch(...);

// ❌ Copilot must NOT do this:
const finalData = applyFilter(data);
```

This causes:

- double filtering
- incorrect results
- broken pagination
- inconsistent UI
- unnecessary performance overhead

---

### ✔ Required

```ts
// Use backend-filtered data directly
const finalData = data;
```

---

## **Copilot Must Follow These Rules**

### 1. If the API request includes filters (e.g., `?page=1&limit=10&status=active`)

→ The backend owns all filtering logic. → Client **must not** apply
`applyFilter()`.

### 2. `applyFilter()` is only allowed for:

- local static arrays
- dropdown options
- small client-only datasets
- preview data
- non-paginated, non-API lists

### 3. When using `<CommonTable

          pagination={{ ...pagination, onChange: handlePageChange }} paging={true} />`

→ Copilot must assume backend pagination → Client-side filtering is **strictly
forbidden**.

### 4. When using `useFilter` with backend queries:

- Copilot must use `query` only to build query string
- **Do not apply `applyFilter()`** to the fetched data

---

## ✔ Rule Summary for Copilot

> **If data comes from the backend with filters applied, Copilot must never call
> `applyFilter()` on that data. `applyFilter()` is strictly for client-side only
> datasets.**

# **15. Table Action Column Rule**

For any Ant Design Table (or custom CommonTable) that requires an “Actions”
column, Copilot must **always** use the shared component:

```tsx
import TableActions from "@/components/TableActions";
```

Copilot must never manually build action buttons inside table columns.

---

## ❌ Forbidden

Copilot must NOT generate any of the following patterns:

```tsx
// ❌ Manually creating buttons
<Button icon={<EditOutlined />} onClick={...} />

// ❌ Creating inline action toolbars
<Space>
  <Tooltip title="Edit"><Button ... /></Tooltip>
  <Tooltip title="Delete"><Button ... /></Tooltip>
</Space>

// ❌ Hard-coding Eye/Delete/Plus buttons directly in column.render
render: (_, record) => (
  <Space>
    <EyeOutlined onClick={...} />
    <DeleteOutlined onClick={...} />
  </Space>
)
```

These are strictly prohibited.

---

## ✔ Required

Copilot must always generate action columns using `TableActions`:

```tsx
{
  title: "Actions",
  key: "actions",
  width: 150,
  fixed: "right",
  render: (_, record) => (
    <TableActions
      onView={() => onView(record)}
      onEdit={() => onEdit(record)}
      onDelete={() => onDelete(record)}
      onPrint={() => onPrint(record)}
      onAdd={() => onAdd(record)}
      onApprove={() => onApprove(record)}
      extraActions={[
        {
          title: "Custom",
          icon: <SomeIcon />,
          onClick: () => handleCustom(record),
          can: true,
        },
      ]}
    />
  ),
}
```

---

## ✔ Extended Rules Copilot must follow

### 1. Action column must always have:

- `width` defined
- `fixed: "right"`
- Correct `title` and `key`

### 2. TableActions props must follow the component interface:

- `onView`, `onPrint`, `onAdd`, `onEdit`, `onApprove`, `onDelete`
- `canView`, `canEdit`, etc. (optional)
- `extraActions` array (optional)

### 3. Buttons must never be recreated manually

Copilot must rely 100% on `TableActions`.

### 4. No inline icons or inline styles inside the column

TableActions already handles all styling, tooltips, colors, icons.

---

# **16. Auto-Generated File Naming Rule**

Whenever Copilot generates a new file (TypeScript, JSON, Markdown, config,
etc.), the filename must always follow this strict naming format:

```
data_<DD_MM_YYYY>.<ext>
```

### ✔ Required Format

- Prefix: `data_`
- Separator: underscore
- Date format: `DD_MM_YYYY` (day first, zero-padded)
- Example for **12 January 2025**:

```
data_12_01_2025.ts
data_12_01_2025.md
data_12_01_2025.json
```

### ✔ Required Behavior for Copilot

- Copilot must **always** use the current real-world date.
- Copilot must never guess or invent a different date format.
- Copilot must never output names like:

  - `data-12-01-2025`
  - `12_01_2025_data`
  - `data20250112`
  - `file_12_01_2025`

- The prefix **must always be `data_`**.

### ❌ Forbidden naming patterns

Copilot must NOT generate:

```txt
report_12_01_2025.ts
log_2025_01_12.json
output.ts
newfile.ts
```

---

# **17. Item Categories Page Template Rule**

This rule defines the standard structure and implementation pattern for all list
pages in the ThienPhuoc project, based on the
`app/(dashboard)/products/item-categories/page.tsx` template. All new pages must
follow this exact structure and conventions.

## **1. Required Page Structure**

Every list page must follow this exact template:

```tsx
"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
// Import required icons from @ant-design/icons
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tag,
} from "antd";
import { useState } from "react";

const { TextArea } = Input;

// Define interface for data type
interface DataType {
  id: number;
  // ... other fields
}

export default function PageName() {
  // Permission hook
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DataType | null>(null);
  const [form] = Form.useForm();

  // Filter hook
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // TanStack Query for data fetching
  const {
    data: items = [],
    isLoading: itemsLoading,
    isFetching: itemsFetching,
  } = useQuery({
    queryKey: ["query-key"],
    queryFn: async () => {
      const res = await fetch("/api/endpoint");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("permission", "view"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/endpoint/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa thành công");
      queryClient.invalidateQueries({ queryKey: ["query-key"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem ? `/api/endpoint/${editingItem.id}` : "/api/endpoint";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success(editingItem ? "Cập nhật thành công" : "Tạo thành công");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["query-key"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Event handlers
  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: DataType) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setShowModal(true);
  };

  const onConfirmDelete = (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa mục này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  // Apply client-side filtering
  const filteredItems = applyFilter(items);

  return (
    <>
      <WrapperContent<DataType>
        title="Page Title"
        isNotAccessible={!can("permission", "view")}
        isLoading={permLoading}
        isRefetching={itemsFetching}
        isEmpty={items.length === 0}
        header={{
          buttonBackTo: "/dashboard/section",
          refetchDataWithKeys: ["query-key"],
          buttonEnds: [
            {
              can: can("permission", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo...",
            filterKeys: ["field1", "field2"],
          },
          filters: {
            fields: [
              // Filter fields array
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          // Optional: columnSettings if needed
          // columnSettings: { ... }
        }}
      >
        <CommonTable
          DrawerDetails={({ data, onClose }: PropRowDetails<DataType>) => (
            // Drawer content for row details
          )}
          columns={[
            // Column definitions with required properties
            {
              title: "Actions",
              key: "actions",
              width: 150,
              fixed: "right",
              render: (_, record) => (
                <TableActions
                  canView={false}
                  canEdit={can("permission", "edit")}
                  canDelete={can("permission", "delete")}
                  onEdit={() => handleEdit(record)}
                  onDelete={() => onConfirmDelete(record.id)}
                  // Optional: extraActions
                />
              ),
            },
          ]}
          dataSource={filteredItems as DataType[]}
          loading={permLoading || itemsLoading || itemsFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa" : "Thêm"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          {/* Form fields */}
        </Form>
      </Modal>
    </>
  );
}
```

## **2. Required Components and Hooks**

### **Mandatory Imports**

- `CommonTable` from `@/components/CommonTable`
- `TableActions` from `@/components/TableActions`
- `WrapperContent` from `@/components/WrapperContent`
- `useFilter` from `@/hooks/useFilter`
- `usePermissions` from `@/hooks/usePermissions`
- TanStack Query: `useMutation`, `useQuery`, `useQueryClient` from
  `@tanstack/react-query`
- Antd: `Button`, `Descriptions`, `Form`, `Input`, `message`, `Modal`, `Select`,
  `Tag` from `antd`
- Icons from `@ant-design/icons`

### **Mandatory Hooks**

- `usePermissions()` for access control
- `useFilter()` for filtering and pagination
- `useQuery()` for data fetching
- `useMutation()` for CRUD operations
- `useState()` for modal and editing state
- `Form.useForm()` for form management

## **3. Required Structure Elements**

### **WrapperContent Header (MANDATORY)**

- `buttonBackTo`: Navigation path
- `refetchDataWithKeys`: Query keys for refresh
- `buttonEnds`: Action buttons array
- `searchInput`: Search configuration
- `filters`: Filter fields and handlers

### **CommonTable (MANDATORY)**

- `DrawerDetails`: Row detail drawer component
- `columns`: Column definitions with required properties
- `dataSource`: Filtered data array
- `loading`: Combined loading states
- `pagination`: Pagination configuration

### **Modal Form (MANDATORY)**

- Create/Edit modal with form validation
- Proper form field handling
- Submit and cancel handlers

## **4. Column Definition Rules**

### **Required Column Properties**

```tsx
{
  title: "Column Title",
  dataIndex: "fieldName",
  key: "fieldName",
  width: 100, // REQUIRED
  // Optional: fixed: "left" | "right" for first/last columns
  // Optional: align: "left" | "center" | "right"
  // Optional: render function
}
```

### **Actions Column (MANDATORY)**

```tsx
{
  title: "Thao tác",
  key: "actions",
  width: 150,
  fixed: "right",
  render: (_, record) => (
    <TableActions
      canView={false}
      canEdit={can("permission", "edit")}
      canDelete={can("permission", "delete")}
      onEdit={() => handleEdit(record)}
      onDelete={() => onConfirmDelete(record.id)}
      // Optional: extraActions
    />
  ),
}
```

## **5. Optional Features (Comment When Not Used)**

### **Column Settings (Optional)**

```tsx
// Optional: Add column settings if table has many columns
// columnSettings: {
//   columns: columnSettings,
//   onChange: setColumnSettings,
//   onReset: resetColumnSettings,
// },
```

### **Extra Actions in TableActions (Optional)**

```tsx
// Optional: Add extra custom actions
// extraActions: [
//   {
//     title: "Custom Action",
//     icon: <CustomIcon />,
//     onClick: () => handleCustom(record),
//     can: true,
//   },
// ]
```

### **Additional Form Fields (Optional)**

```tsx
// Optional: Add more form fields as needed
// <Form.Item name="additionalField" label="Additional Field">
//   <Input />
// </Form.Item>
```

### **Custom Filter Fields (Optional)**

```tsx
// Optional: Add more filter fields
// {
//   type: "select",
//   name: "customField",
//   label: "Custom Filter",
//   options: [],
// },
```

### **Additional Permissions (Optional)**

```tsx
// Optional: Add more permission checks
// canApprove={can("permission", "approve")}
// onApprove={() => handleApprove(record)}
```

## **6. Implementation Rules**

### **Query Key Naming**

- Use kebab-case: `["item-categories"]`, `["sales-orders"]`
- Include filter dependencies when needed

### **Permission Naming**

- Follow pattern: `can("module", "action")`
- Actions: `"view"`, `"create"`, `"edit"`, `"delete"`

### **Message Texts**

- Success: `"Tạo thành công"`, `"Cập nhật thành công"`, `"Xóa thành công"`
- Error: Use error.message from API

### **Form Validation**

- Required fields must have validation rules
- Handle validation errors in catch block

### **Data Filtering**

- Always use `applyFilter()` for client-side filtering
- Cast result: `as DataType[]`

## **7. Forbidden Patterns**

- ❌ Direct `fetch()` calls outside TanStack Query
- ❌ Static Antd APIs (`message.success()`, `Modal.confirm()`)
- ❌ Manual filter logic
- ❌ Custom filter state
- ❌ Custom pagination implementation
- ❌ Manual query string building
- ❌ Tables without `width` property
- ❌ Actions columns without `TableActions`
- ❌ Missing permission checks
- ❌ Missing loading states
- ❌ Missing error handling

## **8. File Naming Convention**

When creating new pages, follow the existing folder structure:

```
app/(dashboard)/module/page-name/page.tsx
```

This template ensures consistency, maintainability, and adherence to all project
rules and conventions. All new list pages must implement this exact structure
with appropriate customizations for their specific data types and requirements.

---

# **18. Column Visibility Rule (useColumn Hook)**

All list pages with tables must implement column visibility functionality using
the `useColumn` hook. This allows users to show/hide table columns dynamically.

### **Required Implementation**

```tsx
import useColumn from "@/hooks/useColumn";

// Define default columns with required properties
const defaultColumns = [
  {
    title: "Column Name",
    dataIndex: "fieldName",
    key: "fieldName",
    width: 100,
    // fixed: "left" | "right" for first/last columns
  },
  // ... other columns
];

// Initialize hook
const {
  columnsCheck,
  updateColumns,
  resetColumns,
  getVisibleColumns,
} = useColumn({ defaultColumns });

// Add to WrapperContent header
header={{
  // ... other props
  columnSettings: {
    columns: columnsCheck,
    onChange: updateColumns,
    onReset: resetColumns,
  },
}}

// Use in CommonTable
<CommonTable
  columns={getVisibleColumns()}
  // ... other props
/>
```

### **Required Behaviors**

- **Default State**: All columns visible by default
- **Persistence**: Column visibility settings maintained during session
- **Reset**: Reset button restores all columns to visible
- **Dynamic Export**: Export functions must respect visible columns only

### **Forbidden**

- ❌ Manual column filtering without useColumn hook
- ❌ Hard-coded column arrays in table components
- ❌ Missing columnSettings in WrapperContent header

---

# **19. File Export Rule (useFileExport Hook)**

All list pages must provide Excel export functionality using the `useFileExport`
hook. Export must respect current filters and visible columns.

### **Required Implementation**

```tsx
import { useFileExport } from "@/hooks/useFileExport";

// Initialize with visible columns
const { exportToXlsx } = useFileExport(getVisibleColumns());

// Create export handler
const handleExportExcel = () => {
  exportToXlsx(filteredData, "page-prefix");
};

// Add export button to WrapperContent header
header={{
  buttonEnds: [
    // ... other buttons
    {
      can: can("module", "view"),
      type: "default",
      name: "Xuất Excel",
      onClick: handleExportExcel,
      icon: <DownloadOutlined />,
    },
  ],
  // ... other props
}}
```

### **Required Behaviors**

- **File Naming**: `data_{prefix}_{DD}_{MM}_{YYYY}.xlsx`
- **Data Filtering**: Export only filtered data (respect search/filters)
- **Column Visibility**: Export only visible columns
- **Permission Check**: Export button requires "view" permission
- **UTF-8 Support**: Proper encoding for Vietnamese characters

### **Forbidden**

- ❌ Direct XLSX manipulation without useFileExport hook
- ❌ Export unfiltered data
- ❌ Missing permission checks on export button
- ❌ Incorrect file naming format

---

# **20. Complete List Page Features Rule**

All list pages in the ThienPhuoc project must implement the following features
in order:

1. **Basic CRUD Operations** (Rule #17)
2. **Column Visibility** (Rule #18)
3. **File Export** (Rule #19)
4. **Search & Filtering** (Rule #4)
5. **Pagination** (Rule #4)
6. **Permission Control** (Rule #17)

### **Feature Checklist**

- ✅ TanStack Query for data fetching
- ✅ useFilter for search/filtering/pagination
- ✅ useColumn for column visibility
- ✅ useFileExport for Excel export
- ✅ usePermissions for access control
- ✅ WrapperContent for consistent UI
- ✅ CommonTable with drawer details
- ✅ TableActions for row operations
- ✅ Modal forms for create/edit
- ✅ Confirm dialogs for delete

### **Implementation Order**

Copilot must implement features in this exact sequence:

1. **First**: Basic page structure (Rule #17)
2. **Second**: Add column visibility (Rule #18)
3. **Third**: Add export functionality (Rule #19)
4. **Fourth**: Verify all rules compliance

This ensures each feature builds upon the previous one and maintains code
quality.

---

# **21. Modal Confirm Rule (Ant Design v6)**

Copilot must **never** use static `Modal.confirm()` API. This causes console
warnings and breaks theme context in Ant Design v6.

### ❌ Forbidden

```tsx
// ❌ NEVER use static Modal.confirm()
const onConfirmDelete = (id: number) => {
  Modal.confirm({
    title: "Xác nhận xóa",
    content: "Bạn có chắc chắn muốn xóa?",
    onOk: () => deleteMutation.mutate(id),
  });
};
```

This produces the error:

```
Warning: [antd: Modal] Static function can not consume context like dynamic theme. Please use 'App' component instead.
```

### ✔ Required

Copilot must always use `modal.confirm()` from `App.useApp()`:

```tsx
"use client";
import { App } from "antd";

export default function Component() {
  const { modal } = App.useApp();

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa?",
      onOk: () => deleteMutation.mutate(id),
    });
  };

  // ... rest of component
}
```

### ✔ Extended Requirements

- **Always import `App` from `antd`**
- **Always destructure `{ modal }` from `App.useApp()`**
- **Use `modal.confirm()` instead of `Modal.confirm()`**
- **Apply to all confirm dialogs**: delete confirmations, approval dialogs, etc.
- **No exceptions**: Static APIs are completely forbidden in Ant Design v6

### ❌ Forbidden Patterns

Copilot must NOT generate:

```tsx
// ❌ Static import
import { Modal } from "antd";
Modal.confirm({...});

// ❌ Direct usage
Modal.confirm({...});

// ❌ Any static Modal methods
Modal.info({...});
Modal.success({...});
Modal.warning({...});
Modal.error({...});
```

### ✔ Required Pattern

```tsx
// ✅ Always use App context
import { App } from "antd";

const { modal, message, notification } = App.useApp();

// ✅ Use context methods
modal.confirm({...});
message.success("Success");
notification.error({...});
```

This rule ensures proper theme context and eliminates console warnings in Ant
Design v6.

---

# **22. Modal Loading State Rule**

All modals that contain forms and call API mutations must include
`confirmLoading` prop to show loading state during submission.

### ❌ Forbidden

```tsx
// ❌ Missing confirmLoading - user can click multiple times
<Modal
  title={editingItem ? "Sửa" : "Thêm"}
  open={showModal}
  onCancel={() => setShowModal(false)}
  onOk={handleSubmit}
  okText="Lưu"
  cancelText="Hủy"
>
```

### ✔ Required

```tsx
// ✅ Always include confirmLoading with mutation pending state
<Modal
  title={editingItem ? "Sửa" : "Thêm"}
  open={showModal}
  onCancel={() => setShowModal(false)}
  onOk={handleSubmit}
  okText="Lưu"
  cancelText="Hủy"
  confirmLoading={saveMutation.isPending}
>
```

### ✔ Extended Requirements

- **Always add `confirmLoading`** when modal calls API mutation
- **Use mutation's `isPending` state**: `confirmLoading={mutation.isPending}`
- **Disable multiple submissions**: Loading state prevents duplicate API calls
- **Apply to all form modals**: Create, edit, and any modal with API submission
- **Consistent UX**: Users see loading spinner on submit button

### ❌ Forbidden Patterns

Copilot must NOT generate modals without loading state:

```tsx
// ❌ No confirmLoading
<Modal onOk={handleSubmit} />

// ❌ Wrong loading state
<Modal confirmLoading={isLoading} />

// ❌ Missing for edit modals
<Modal confirmLoading={createMutation.isPending} /> // but edit uses different mutation
```

### ✔ Required Pattern

```tsx
// ✅ Correct for both create and edit
const saveMutation = useMutation({...});

<Modal
  confirmLoading={saveMutation.isPending}
  onOk={() => saveMutation.mutate(formValues)}
/>
```

This rule ensures proper loading states and prevents duplicate API calls in
modal forms.
