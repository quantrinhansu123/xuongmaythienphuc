import { ApiResponse } from "@/types";

export interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  groupName?: string;
  priceMultiplier?: number;
  debtAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerDto {
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
}

export interface UpdateCustomerDto {
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  isActive?: boolean;
}

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const res = await fetch("/api/sales/customers");
    const data: ApiResponse<Customer[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customers");
    return (data.data || []) as Customer[];
  },

  getById: async (id: number): Promise<Customer> => {
    const res = await fetch(`/api/sales/customers/${id}`);
    const data: ApiResponse<Customer> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customer");
    return data.data!;
  },

  create: async (customerData: CreateCustomerDto): Promise<Customer> => {
    const res = await fetch("/api/sales/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    });
    const data: ApiResponse<Customer> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create customer");
    return data.data!;
  },

  update: async (id: number, customerData: UpdateCustomerDto): Promise<Customer> => {
    const res = await fetch(`/api/sales/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    });
    const data: ApiResponse<Customer> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update customer");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/sales/customers/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete customer");
  },
};
