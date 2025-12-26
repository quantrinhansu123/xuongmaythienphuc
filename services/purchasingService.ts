import { ApiResponse } from "@/types";

export interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
}

export interface CreateSupplierDto {
  supplierCode: string;
  supplierName: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto> & {
  isActive?: boolean;
};

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const res = await fetch("/api/purchasing/suppliers");
    const data: ApiResponse<Supplier[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch suppliers");
    return data.data || [];
  },

  getById: async (id: number): Promise<Supplier> => {
    const res = await fetch(`/api/purchasing/suppliers/${id}`);
    const data: ApiResponse<Supplier> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch supplier");
    return data.data!;
  },

  create: async (supplierData: CreateSupplierDto): Promise<Supplier> => {
    const res = await fetch("/api/purchasing/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierData),
    });
    const data: ApiResponse<Supplier> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create supplier");
    return data.data!;
  },

  update: async (id: number, supplierData: UpdateSupplierDto): Promise<Supplier> => {
    const res = await fetch(`/api/purchasing/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierData),
    });
    const data: ApiResponse<Supplier> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update supplier");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/purchasing/suppliers/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete supplier");
  },
};

export interface PurchaseOrder {
  id: number;
  orderCode: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  deliveryDate?: string;
  totalAmount: number;
  discount?: number;
  finalAmount: number;
  status: string;
  notes?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id?: number;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  amount: number;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  orderCode: string;
  supplierId: number;
  orderDate: string;
  deliveryDate?: string;
  discount?: number;
  notes?: string;
  items: Array<{
    materialId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    notes?: string;
  }>;
}

export type UpdatePurchaseOrderDto = Partial<CreatePurchaseOrderDto> & {
  status?: string;
};

export const purchaseOrderService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    const res = await fetch("/api/purchasing/orders");
    const data: ApiResponse<PurchaseOrder[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch purchase orders");
    return data.data || [];
  },

  getById: async (id: number): Promise<PurchaseOrder> => {
    const res = await fetch(`/api/purchasing/orders/${id}`);
    const data: ApiResponse<PurchaseOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch purchase order");
    return data.data!;
  },

  create: async (orderData: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const res = await fetch("/api/purchasing/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data: ApiResponse<PurchaseOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create purchase order");
    return data.data!;
  },

  update: async (id: number, orderData: UpdatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const res = await fetch(`/api/purchasing/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data: ApiResponse<PurchaseOrder> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update purchase order");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/purchasing/orders/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete purchase order");
  },
};
