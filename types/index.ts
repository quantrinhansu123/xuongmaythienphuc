// User & Auth Types
export interface User {
  id: number;
  userCode: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  departmentId?: number;
  departmentName?: string;
  branchId: number; // Primary branch for backward compatibility
  branchName?: string;
  roleId: number;
  roleName?: string;
  roleCode?: string;
  isActive: boolean;
  isDefaultPassword?: boolean;
  branches?: Branch[]; // List of all accessible branches
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: number;
  departmentCode: string;
  departmentName: string;
  description?: string;
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

// Product & Category Types
export type CategoryType = 'PRODUCT' | 'MATERIAL';

export interface CategoryMeasurement {
  id: number;
  categoryId: number;
  measurementName: string;
  unit: string;
  isRequired: boolean;
}

export interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
  type: CategoryType; // New field
  isActive: boolean;
  itemCount?: number; // New field
  items?: any[]; // For future use
  createdAt: string;
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
