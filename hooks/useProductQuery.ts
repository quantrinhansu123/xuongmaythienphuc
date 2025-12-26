import {
  categoryService,
  materialService,
  productService,
  type CreateCategoryDto,
  type CreateMaterialDto,
  type CreateProductDto,
  type UpdateCategoryDto,
  type UpdateMaterialDto,
  type UpdateProductDto,
} from "@/services/productService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

// Query Keys
export const PRODUCT_KEYS = {
  all: ["products"] as const,
  lists: () => [...PRODUCT_KEYS.all, "list"] as const,
  list: (filters: string) => [...PRODUCT_KEYS.lists(), { filters }] as const,
  details: () => [...PRODUCT_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PRODUCT_KEYS.details(), id] as const,
  bom: (id: number) => [...PRODUCT_KEYS.detail(id), "bom"] as const,
};

export const CATEGORY_KEYS = {
  all: ["categories"] as const,
  lists: () => [...CATEGORY_KEYS.all, "list"] as const,
};

export const MATERIAL_KEYS = {
  all: ["materials"] as const,
  lists: () => [...MATERIAL_KEYS.all, "list"] as const,
};

// Product Hooks
export function useProducts() {
  return useQuery({
    queryKey: PRODUCT_KEYS.lists(),
    queryFn: productService.getAll,
    staleTime: 5 * 60 * 1000, // Cache
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => productService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useProductBOM(id: number) {
  return useQuery({
    queryKey: PRODUCT_KEYS.bom(id),
    queryFn: () => productService.getBOM(id),
    staleTime: 10 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Tạo sản phẩm thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo sản phẩm thất bại");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductDto }) =>
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Cập nhật sản phẩm thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật sản phẩm thất bại");
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      message.success("Xóa sản phẩm thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa sản phẩm thất bại");
    },
  });
}

// Category Hooks
export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEYS.lists(),
    queryFn: categoryService.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: [...CATEGORY_KEYS.all, "detail", id] as const,
    queryFn: () => categoryService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Tạo danh mục thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo danh mục thất bại");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryDto }) =>
      categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Cập nhật danh mục thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật danh mục thất bại");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      message.success("Xóa danh mục thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa danh mục thất bại");
    },
  });
}

// Material Hooks
export function useMaterials() {
  return useQuery({
    queryKey: MATERIAL_KEYS.lists(),
    queryFn: materialService.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: [...MATERIAL_KEYS.all, "detail", id] as const,
    queryFn: () => materialService.getById(id),
    staleTime: 5 * 60 * 1000, // Cache
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaterialDto) => materialService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Tạo nguyên liệu thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Tạo nguyên liệu thất bại");
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaterialDto }) =>
      materialService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Cập nhật nguyên liệu thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Cập nhật nguyên liệu thất bại");
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => materialService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATERIAL_KEYS.all });
      message.success("Xóa nguyên liệu thành công");
    },
    onError: (error: Error) => {
      message.error(error.message || "Xóa nguyên liệu thất bại");
    },
  });
}
