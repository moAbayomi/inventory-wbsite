import api from "./axios";
import type { CategoryListResponse, Category } from "../types/api";
import type { CategoryFormData } from "../schemas/category";

export const getCategoryCount = async (): Promise<CategoryListResponse> => {
  const res = await api.get<CategoryListResponse>("/categories");
  return res.data;
};

export const newCategory = async (
  data: CategoryFormData,
): Promise<Category> => {
  const res = await api.post<Category>("/categories", data);
  return res.data;
};

// Soft delete on the backend (sets is_active: false, items keep their
// category_id) -- this just calls it. The category drops out of the
// default GET /categories list afterwards.
export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
