import { customerGroupService } from "@/services/customerGroupService";
import { customerService, type CreateCustomerDto, type UpdateCustomerDto } from "@/services/customerService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

export const CUSTOMER_KEYS = {
  all: ["customers"],
  lists: () => [...CUSTOMER_KEYS.all, "list"],
  list: (filters?: Record<string, unknown>) => [...CUSTOMER_KEYS.lists(), filters],
  details: () => [...CUSTOMER_KEYS.all, "detail"],
  detail: (id: number) => [...CUSTOMER_KEYS.details(), id],
};

// Hook để fetch tất cả customers
export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMER_KEYS.lists(),
    queryFn: customerService.getAll,
    staleTime: 30 * 60 * 1000, // Cache
  });
}

// Hook để fetch customer theo ID
export function useCustomer(id: number) {

  return useQuery({
    queryKey: CUSTOMER_KEYS.detail(id),
    queryFn: () => customerService.getById(id),
    staleTime: 30 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

// Hook để tạo customer mới
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (customerData: CreateCustomerDto) => customerService.create(customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.lists() });
      // Cập nhật số lượng khách hàng trong nhóm
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      message.success("Tạo khách hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi tạo khách hàng");
    },
  });
}

// Hook để cập nhật customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();


  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDto }) =>
      customerService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.detail(variables.id) });
      // Cập nhật số lượng khách hàng trong nhóm (khi đổi nhóm)
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      message.success("Cập nhật thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi cập nhật khách hàng");
    },
  });
}

// Hook để xóa customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.lists() });
      // Cập nhật số lượng khách hàng trong nhóm
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      message.success("Xóa thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi xóa khách hàng");
    },
  });
}

// Hook để fetch customer groups (for dropdown)
export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer-groups", "list"],
    queryFn: customerGroupService.getAll,
    staleTime: 30 * 60 * 1000, // Cache
  });
}
