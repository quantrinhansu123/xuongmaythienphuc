import { ApiResponse } from "@/types";

export interface CustomerGroup {
  id: number;
  groupCode: string;
  groupName: string;
  priceMultiplier: number;
  description?: string;
  customerCount?: number;
  createdAt: string;
}

export interface CreateCustomerGroupDto {
  groupCode: string;
  groupName: string;
  priceMultiplier: number;
  description?: string;
}

export interface UpdateCustomerGroupDto {
  groupName: string;
  priceMultiplier: number;
  description?: string;
}

export const customerGroupService = {
  getAll: async (): Promise<CustomerGroup[]> => {
    const res = await fetch("/api/sales/customer-groups");
    const data: ApiResponse<CustomerGroup[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customer groups");
    return (data.data || []) as CustomerGroup[];
  },

  getById: async (id: number): Promise<CustomerGroup> => {
    const res = await fetch(`/api/sales/customer-groups/${id}`);
    const data: ApiResponse<CustomerGroup> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customer group");
    return data.data!;
  },

  create: async (groupData: CreateCustomerGroupDto): Promise<CustomerGroup> => {
    const res = await fetch("/api/sales/customer-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });
    const data: ApiResponse<CustomerGroup> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create customer group");
    return data.data!;
  },

  update: async (id: number, groupData: UpdateCustomerGroupDto): Promise<CustomerGroup> => {
    const res = await fetch(`/api/sales/customer-groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });
    const data: ApiResponse<CustomerGroup> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update customer group");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/sales/customer-groups/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete customer group");
  },
};
