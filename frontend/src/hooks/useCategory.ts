import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategoryCount, newCategory } from "../api/categories";
import type { Category } from "../types/api";
import type { CategoryFormData } from "../schemas/category";
import type { AxiosError } from "axios";
import { useAuth } from "./useAuth";
import { categoryKeys } from "../queries/keys";

export function useCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list,
    queryFn: getCategoryCount,
    enabled: !!user,
    staleTime: 60_000,
  });

  const createCategory = useMutation<
    Category,
    AxiosError<{ error?: string }>,
    CategoryFormData
  >({
    mutationFn: (data) => newCategory(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.list }),
  });

  return {
    categories: categoriesQuery.data?.categories,
    count: categoriesQuery.data?.count,
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    createCategory,
  };
}
