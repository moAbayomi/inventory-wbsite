import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategoryCount, newCategory, deleteCategory } from "../api/categories";
import type { Category } from "../types/api";
import type { CategoryFormData } from "../schemas/category";
import type { AxiosError } from "axios";
import { useAuth } from "./useAuth";
import { categoryKeys, itemKeys } from "../queries/keys";

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

  const removeCategory = useMutation<void, AxiosError<{ error?: string }>, string>({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.list });
      // Items keep their category_id (it's a soft delete), but that
      // category's name/count no longer shows correctly anywhere it's
      // joined client-side against the item list -- refetching keeps
      // Inventory's category filter (if any) and item counts honest.
      queryClient.invalidateQueries({ queryKey: itemKeys.list });
    },
  });

  return {
    categories: categoriesQuery.data?.categories,
    count: categoriesQuery.data?.count,
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    createCategory,
    removeCategory,
  };
}
