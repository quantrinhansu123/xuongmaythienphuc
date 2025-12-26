import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService, type CreateOrderDto } from "@/services/orderService";
import { message } from "antd";

export const ORDER_KEYS = {
  all: ["orders"],
  lists: () => [...ORDER_KEYS.all, "list"],
  list: (filters?: Record<string, unknown>) => [...ORDER_KEYS.lists(), filters],
  details: () => [...ORDER_KEYS.all, "detail"],
  detail: (id: number) => [...ORDER_KEYS.details(), id],
};

// Hook để fetch tất cả orders
export function useOrders() {
  return useQuery({
    queryKey: ORDER_KEYS.lists(),
    queryFn: orderService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

// Hook để fetch order theo ID
export function useOrder(id: number) {
  return useQuery({
    queryKey: ORDER_KEYS.detail(id),
    queryFn: () => orderService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

// Hook để tạo order mới
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderDto) => orderService.create(orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      message.success(`Tạo đơn hàng thành công! Mã đơn: ${data.orderCode}`);
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi tạo đơn hàng");
    },
  });
}

// Hook để cập nhật trạng thái order
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      orderService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(variables.id) });
      message.success("Cập nhật trạng thái thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi cập nhật trạng thái");
    },
  });
}

// Hook để cập nhật bước sản xuất
export function useUpdateProductionStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, step }: { id: number; step: string }) =>
      orderService.updateProductionStep(id, step),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(variables.id) });
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi cập nhật bước sản xuất");
    },
  });
}
