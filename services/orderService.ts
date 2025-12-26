import { ApiResponse } from "@/types";

export interface Order {
  id: number;
  orderCode: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface OrderDetail extends Order {
  details: OrderItem[];
  production?: {
    cutting: boolean;
    sewing: boolean;
    finishing: boolean;
    quality_check: boolean;
  };
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface CreateOrderDto {
  customerId: number;
  orderDate: string;
  notes?: string;
  discountAmount?: number;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    notes?: string;
  }[];
}

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    const res = await fetch("/api/sales/orders");
    const data: ApiResponse<Order[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch orders");
    return (data.data || []) as Order[];
  },

  getById: async (id: number): Promise<OrderDetail> => {
    const res = await fetch(`/api/sales/orders/${id}`);
    const data: ApiResponse<OrderDetail> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch order");
    return data.data!;
  },

  create: async (orderData: CreateOrderDto): Promise<{ id: number; orderCode: string }> => {
    const res = await fetch("/api/sales/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data: ApiResponse<{ id: number; orderCode: string }> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create order");
    return data.data!;
  },

  updateStatus: async (id: number, status: string): Promise<void> => {
    const res = await fetch(`/api/sales/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update status");
  },

  updateProductionStep: async (id: number, step: string): Promise<void> => {
    const res = await fetch(`/api/sales/orders/${id}/production`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    });
    const data: ApiResponse = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update production step");
  },

  getMaterialSuggestion: async (id: number) => {
    const res = await fetch(`/api/sales/orders/${id}/material-suggestion`);
    const data: ApiResponse<any> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to get material suggestion");
    return data.data;
  },
};
