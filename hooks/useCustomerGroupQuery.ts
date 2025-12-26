import { customerGroupService, type CreateCustomerGroupDto, type UpdateCustomerGroupDto } from "@/services/customerGroupService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";


export const CUSTOMER_GROUP_KEYS = {
  all: ["customer-groups"],
  lists: () => [...CUSTOMER_GROUP_KEYS.all, "list"],
  list: (filters?: Record<string, unknown>) => [...CUSTOMER_GROUP_KEYS.lists(), filters],
  details: () => [...CUSTOMER_GROUP_KEYS.all, "detail"],
  detail: (id: number) => [...CUSTOMER_GROUP_KEYS.details(), id],
};

// Hook để fetch tất cả customer groups
export function useCustomerGroups() {
  return useQuery({
    queryKey: CUSTOMER_GROUP_KEYS.lists(),
    queryFn: customerGroupService.getAll,
    staleTime: 30 * 60 * 1000, // Cache
  });
}

// Hook để fetch customer group theo ID
export function useCustomerGroup(id: number) {
  return useQuery({
    queryKey: CUSTOMER_GROUP_KEYS.detail(id),
    queryFn: () => customerGroupService.getById(id),
    staleTime: 30 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

// Hook để tạo customer group mới
export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (groupData: CreateCustomerGroupDto) => customerGroupService.create(groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_GROUP_KEYS.lists() });
      message.success("Tạo nhóm khách hàng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi tạo nhóm khách hàng");
    },
  });
}

// Hook để cập nhật customer group
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerGroupDto }) =>
      customerGroupService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_GROUP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_GROUP_KEYS.detail(variables.id) });
      message.success("Cập nhật thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi cập nhật nhóm khách hàng");
    },
  });
}

// Hook để xóa customer group
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: number) => customerGroupService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_GROUP_KEYS.lists() });
      message.success("Xóa thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi xóa nhóm khách hàng");
    },
  });
}
