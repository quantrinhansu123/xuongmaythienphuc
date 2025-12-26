import { ApiResponse } from "@/types";

export interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  customerGroupName?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
}

export interface CreateCustomerDto {
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto> & {
  isActive?: boolean;
};

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const res = await fetch("/api/sales/customers");
    const data: ApiResponse<Customer[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customers");
    return data.data || [];
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
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete customer");
  },
};

export interface CustomerGroup {
  id: number;
  groupCode: string;
  groupName: string;
  discountPercent?: number;
  description?: string;
}

export const customerGroupService = {
  getAll: async (): Promise<CustomerGroup[]> => {
    const res = await fetch("/api/sales/customer-groups");
    const data: ApiResponse<CustomerGroup[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch customer groups");
    return data.data || [];
  },
};

export interface SalesOrder {
  id: number;
  orderCode: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  deliveryDate?: string;
  totalAmount: number;
  discount?: number;
  finalAmount: number;
  status: string;
  notes?: string;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id?: number;
  productId: number;
  productCode?: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  amount: number;
  notes?: string;
}

export interface CreateSalesOrderDto {
  orderCode: string;
  customerId: number;
  orderDate: string;
  deliveryDate?: string;
  discount?: number;
  notes?: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    notes?: string;
  }>;
}

export type UpdateSalesOrderDto = Partial<CreateSalesOrderDto> & {
  status?: string;
};

export const salesOrderService = {
  getAll: async (): Promise<SalesOrder[]> => {
    const res = await fetch("/api/sales/orders");
    const data: ApiResponse<SalesOrder[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch sales orders");
    return data.data || [];
  },

  getById: async (id: number): Promise<SalesOrder> => {
    const res = await fetch(`/api/sales/orders/${id}`);
    const data: ApiResponse<SalesOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch sales order");
    return data.data!;
  },

  create: async (orderData: CreateSalesOrderDto): Promise<SalesOrder> => {
    const res = await fetch("/api/sales/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data: ApiResponse<SalesOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create sales order");
    return data.data!;
  },

  update: async (id: number, orderData: UpdateSalesOrderDto): Promise<SalesOrder> => {
    const res = await fetch(`/api/sales/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data: ApiResponse<SalesOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update sales order");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/sales/orders/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete sales order");
  },
};
