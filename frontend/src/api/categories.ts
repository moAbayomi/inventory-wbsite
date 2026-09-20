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
