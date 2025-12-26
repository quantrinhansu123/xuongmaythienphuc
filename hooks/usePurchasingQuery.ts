import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  supplierService,
  purchaseOrderService,
  type CreateSupplierDto,
  type UpdateSupplierDto,
  type CreatePurchaseOrderDto,
  type UpdatePurchaseOrderDto,
} from "@/services/purchasingService";

// Query Keys
export const SUPPLIER_KEYS = {
  all: ["suppliers"] as const,
  lists: () => [...SUPPLIER_KEYS.all, "list"] as const,
  details: () => [...SUPPLIER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...SUPPLIER_KEYS.details(), id] as const,
};

export const PURCHASE_ORDER_KEYS = {
  all: ["purchase-orders"] as const,
  lists: () => [...PURCHASE_ORDER_KEYS.all, "list"] as const,
  details: () => [...PURCHASE_ORDER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PURCHASE_ORDER_KEYS.details(), id] as const,
};

// Supplier Hooks
export function useSuppliers() {
  return useQuery({
    queryKey: SUPPLIER_KEYS.lists(),
    queryFn: supplierService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: SUPPLIER_KEYS.detail(id),
    queryFn: () => supplierService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierDto) => supplierService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      message.success("Tạo nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo nhà cung cấp thất bại");
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSupplierDto }) =>
      supplierService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      message.success("Cập nhật nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật nhà cung cấp thất bại");
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      message.success("Xóa nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa nhà cung cấp thất bại");
    },
  });
}

// Purchase Order Hooks
export function usePurchaseOrders() {
  return useQuery({
    queryKey: PURCHASE_ORDER_KEYS.lists(),
    queryFn: purchaseOrderService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: PURCHASE_ORDER_KEYS.detail(id),
    queryFn: () => purchaseOrderService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderDto) => purchaseOrderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_KEYS.all });
      message.success("Tạo đơn mua hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo đơn mua hàng thất bại");
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePurchaseOrderDto }) =>
      purchaseOrderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_KEYS.all });
      message.success("Cập nhật đơn mua hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật đơn mua hàng thất bại");
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => purchaseOrderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_KEYS.all });
      message.success("Xóa đơn mua hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa đơn mua hàng thất bại");
    },
  });
}
