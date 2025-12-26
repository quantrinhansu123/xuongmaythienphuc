import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  customerService,
  customerGroupService,
  salesOrderService,
  type CreateCustomerDto,
  type UpdateCustomerDto,
  type CreateSalesOrderDto,
  type UpdateSalesOrderDto,
} from "@/services/salesService";

// Query Keys
export const CUSTOMER_KEYS = {
  all: ["customers"] as const,
  lists: () => [...CUSTOMER_KEYS.all, "list"] as const,
  details: () => [...CUSTOMER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...CUSTOMER_KEYS.details(), id] as const,
};

export const CUSTOMER_GROUP_KEYS = {
  all: ["customer-groups"] as const,
  lists: () => [...CUSTOMER_GROUP_KEYS.all, "list"] as const,
};

export const SALES_ORDER_KEYS = {
  all: ["sales-orders"] as const,
  lists: () => [...SALES_ORDER_KEYS.all, "list"] as const,
  details: () => [...SALES_ORDER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...SALES_ORDER_KEYS.details(), id] as const,
};

// Customer Hooks
export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMER_KEYS.lists(),
    queryFn: customerService.getAll,
    staleTime: 30 * 60 * 1000, // Cache
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.detail(id),
    queryFn: () => customerService.getById(id),
    staleTime: 30 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
      message.success("Tạo khách hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo khách hàng thất bại");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDto }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
      message.success("Cập nhật khách hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật khách hàng thất bại");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.all });
      message.success("Xóa khách hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa khách hàng thất bại");
    },
  });
}

// Customer Group Hooks
export function useCustomerGroups() {
  return useQuery({
    queryKey: CUSTOMER_GROUP_KEYS.lists(),
    queryFn: customerGroupService.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

// Sales Order Hooks
export function useSalesOrders() {
  return useQuery({
    queryKey: SALES_ORDER_KEYS.lists(),
    queryFn: salesOrderService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

export function useSalesOrder(id: number) {
  return useQuery({
    queryKey: SALES_ORDER_KEYS.detail(id),
    queryFn: () => salesOrderService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesOrderDto) => salesOrderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDER_KEYS.all });
      message.success("Tạo đơn hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo đơn hàng thất bại");
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSalesOrderDto }) =>
      salesOrderService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDER_KEYS.all });
      message.success("Cập nhật đơn hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật đơn hàng thất bại");
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesOrderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDER_KEYS.all });
      message.success("Xóa đơn hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa đơn hàng thất bại");
    },
  });
}
