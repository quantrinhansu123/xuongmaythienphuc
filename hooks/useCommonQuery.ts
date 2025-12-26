import { branchService, roleService } from "@/services/commonService";
import { useQuery } from "@tanstack/react-query";

export const ROLE_KEYS = {
  all: ["roles"] as const,
  lists: () => [...ROLE_KEYS.all, "list"] as const,
};

export const BRANCH_KEYS = {
  all: ["branches"] as const,
  lists: () => [...BRANCH_KEYS.all, "list"] as const,
};

// Hook để fetch tất cả roles
export function useRoles() {
  return useQuery({
    queryKey: ROLE_KEYS.lists(),
    queryFn: roleService.getAll,
    staleTime: 10 * 60 * 1000, // Cache 10 phút (roles ít thay đổi)
    gcTime: 30 * 60 * 1000, // Giữ cache 30 phút
  });
}

// Hook để fetch tất cả branches
export function useBranches() {
  return useQuery({
    queryKey: BRANCH_KEYS.lists(),
    queryFn: branchService.getAll,
    staleTime: 10 * 60 * 1000, // Cache 10 phút (branches ít thay đổi)
    gcTime: 30 * 60 * 1000, // Giữ cache 30 phút
  });
}
