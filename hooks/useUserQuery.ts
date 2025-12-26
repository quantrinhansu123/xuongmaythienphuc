import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService, type CreateUserDto, type UpdateUserDto } from "@/services/userService";
import { message } from "antd";

export const USER_KEYS = {
  all: ["users"],
  lists: () => [...USER_KEYS.all, "list"],
  list: (filters?: Record<string, unknown>) => [...USER_KEYS.lists(), filters],
  details: () => [...USER_KEYS.all, "detail"],
  detail: (id: number) => [...USER_KEYS.details(), id],
};

// Hook để fetch tất cả users
export function useUsers() {
  return useQuery({
    queryKey: USER_KEYS.lists(),
    queryFn: userService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

// Hook để fetch user theo ID
export function useUser(id: number) {
  return useQuery({
    queryKey: USER_KEYS.detail(id),
    queryFn: () => userService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

// Hook để tạo user mới
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserDto) => userService.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      message.success("Tạo người dùng thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi tạo người dùng");
    },
  });
}

// Hook để cập nhật user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      userService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(variables.id) });
      message.success("Cập nhật thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi cập nhật người dùng");
    },
  });
}

// Hook để xóa user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
      message.success("Xóa thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Lỗi khi xóa người dùng");
    },
  });
}
