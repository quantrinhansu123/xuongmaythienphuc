// User & Auth Types
export interface User {
  id: number;
  userCode: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  branchId: number;
  roleId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
}

export interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}


export interface FilterField {
  type: "input" | "select" | "date" | "dateRange" | "custom";
  name: string;
  label: string;
  isMultiple?: boolean;
  placeholder?: string;
  options?: { label: string; value: string | number | boolean }[];
  render?: () => React.ReactNode;
}

export interface ColumnSetting {
  key: string;
  title: string;
  visible: boolean;
}
