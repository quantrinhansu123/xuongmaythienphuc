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
