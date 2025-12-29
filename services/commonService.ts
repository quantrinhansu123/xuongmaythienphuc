import { ApiResponse } from "@/types";

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

export interface Department {
  id: number;
  departmentCode: string;
  departmentName: string;
  description?: string;
  userCount?: number;
}

export interface CreateDepartmentDto {
  departmentCode: string;
  departmentName: string;
  description?: string;
}

export interface UpdateDepartmentDto {
  departmentName: string;
  description?: string;
}

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const res = await fetch("/api/admin/roles");
    const data: ApiResponse<Role[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch roles");
    return data.data || [];
  },
};

export const branchService = {
  getAll: async (): Promise<Branch[]> => {
    const res = await fetch("/api/admin/branches");
    const data: ApiResponse<Branch[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch branches");
    return data.data || [];
  },
};

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const res = await fetch("/api/admin/departments");
    const data: ApiResponse<Department[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch departments");
    return data.data || [];
  },

  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result: ApiResponse<Department> = await res.json();
    if (!result.success) throw new Error(result.error || "Failed to create department");
    return result.data!;
  },

  update: async (id: number, data: UpdateDepartmentDto): Promise<Department> => {
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result: ApiResponse<Department> = await res.json();
    if (!result.success) throw new Error(result.error || "Failed to update department");
    return result.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: "DELETE",
    });
    const result: ApiResponse = await res.json();
    if (!result.success) throw new Error(result.error || "Failed to delete department");
  },
};
