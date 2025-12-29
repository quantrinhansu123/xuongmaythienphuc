import { ApiResponse } from "@/types";

export interface User {
  id: number;
  userCode: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  departmentId?: number;
  departmentName?: string;
  branchId: number;
  branchName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  isDefaultPassword?: boolean;
  branches?: { id: number; branchName: string; branchCode: string }[];
  createdAt: string;
}

export interface CreateUserDto {
  userCode?: string;
  username: string;
  password?: string;
  fullName: string;
  email?: string;
  phone?: string;
  branchId?: number; // Primary branch
  branchIds?: number[]; // All branches
  departmentId?: number;
  roleId: number;
}

export interface UpdateUserDto {
  fullName: string;
  email?: string;
  phone?: string;
  branchId?: number;
  branchIds?: number[];
  departmentId?: number;
  roleId: number;
  isActive: boolean;
}

export const userService = {
  getAll: async (filters?: { departmentId?: number }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.departmentId) {
      params.append("departmentId", filters.departmentId.toString());
    }
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const data: ApiResponse<{ users: User[] }> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch users");
    return data.data?.users || [];
  },

  getById: async (id: number): Promise<User> => {
    const res = await fetch(`/api/admin/users/${id}`);
    const data: ApiResponse<User> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch user");
    return data.data!;
  },

  create: async (userData: CreateUserDto): Promise<User> => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data: ApiResponse<User> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create user");
    return data.data!;
  },

  update: async (id: number, userData: UpdateUserDto): Promise<User> => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data: ApiResponse<User> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update user");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete user");
  },

  resetPassword: async (id: number): Promise<void> => {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to reset password");
  },
};
