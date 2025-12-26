import { ApiResponse } from "@/types";

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  description?: string;
  unit: string;
  costPrice?: number;
  branchName: string;
  isActive: boolean;
  branchId: number;
}

export interface BOMItem {
  id?: number;
  materialId: number;
  materialCode?: string;
  materialName?: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface CreateProductDto {
  productCode: string;
  productName: string;
  categoryId?: number;
  description?: string;
  unit: string;
  costPrice?: number;
  bom?: Array<{
    materialId: number;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const res = await fetch("/api/products");
    const data: ApiResponse<{ products: Product[] }> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch products");
    return data.data?.products || [];
  },

  getById: async (id: number): Promise<Product> => {
    const res = await fetch(`/api/products/${id}`);
    const data: ApiResponse<Product> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch product");
    return data.data!;
  },

  create: async (productData: CreateProductDto): Promise<Product> => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    const data: ApiResponse<Product> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create product");
    return data.data!;
  },

  update: async (id: number, productData: UpdateProductDto): Promise<Product> => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    const data: ApiResponse<Product> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update product");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete product");
  },

  getBOM: async (productId: number): Promise<BOMItem[]> => {
    const res = await fetch(`/api/products/${productId}/bom`);
    const data: ApiResponse<BOMItem[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch BOM");
    return data.data || [];
  },
};

export interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  description?: string;
}

export interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
  unitPrice?: number;
}

export interface CreateCategoryDto {
  categoryCode: string;
  categoryName: string;
  description?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export interface CreateMaterialDto {
  materialCode: string;
  materialName: string;
  unit: string;
  unitPrice?: number;
  description?: string;
}

export type UpdateMaterialDto = Partial<CreateMaterialDto>;

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const res = await fetch("/api/products/categories");
    const data: ApiResponse<Category[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch categories");
    return data.data || [];
  },

  getById: async (id: number): Promise<Category> => {
    const res = await fetch(`/api/products/categories/${id}`);
    const data: ApiResponse<Category> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch category");
    return data.data!;
  },

  create: async (categoryData: CreateCategoryDto): Promise<Category> => {
    const res = await fetch("/api/products/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryData),
    });
    const data: ApiResponse<Category> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create category");
    return data.data!;
  },

  update: async (id: number, categoryData: UpdateCategoryDto): Promise<Category> => {
    const res = await fetch(`/api/products/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryData),
    });
    const data: ApiResponse<Category> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update category");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/products/categories/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete category");
  },
};

export const materialService = {
  getAll: async (): Promise<Material[]> => {
    const res = await fetch("/api/products/materials");
    const data: ApiResponse<Material[]> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch materials");
    return data.data || [];
  },

  getById: async (id: number): Promise<Material> => {
    const res = await fetch(`/api/products/materials/${id}`);
    const data: ApiResponse<Material> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch material");
    return data.data!;
  },

  create: async (materialData: CreateMaterialDto): Promise<Material> => {
    const res = await fetch("/api/products/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(materialData),
    });
    const data: ApiResponse<Material> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to create material");
    return data.data!;
  },

  update: async (id: number, materialData: UpdateMaterialDto): Promise<Material> => {
    const res = await fetch(`/api/products/materials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(materialData),
    });
    const data: ApiResponse<Material> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to update material");
    return data.data!;
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`/api/products/materials/${id}`, {
      method: "DELETE",
    });
    const data: ApiResponse<void> = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete material");
  },
};
