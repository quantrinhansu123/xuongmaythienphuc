export interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
}

export type CategoryFormValues = {
  categoryCode: string;
  categoryName: string;
  parentId?: number | string;
  description?: string;
};
