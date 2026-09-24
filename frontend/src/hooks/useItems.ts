import { getInventoryItems, adjustItemStock, deleteItem } from "../api/items";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { itemKeys, inventoryKeys } from "../queries/keys";
import { useAuth } from "./useAuth";
import type { InventoryItem } from "../types/api";

export const useItems = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: itemKeys.list,
    queryFn: getInventoryItems,
    enabled: !!user,
    staleTime: 60_000,
  });
};

interface AdjustStockParams {
  id: string;
  type: "RESTOCK" | "WASTE" | "ADJUSTMENT";
  quantity: number;
  note?: string;
}

// Manual stock movements from outside any one item's own page -- e.g. the
// Dashboard's "Log stock update" button, which isn't scoped to a single
// item. Invalidates the same query keys a sale does (item list, dashboard
// totals, low-stock), since an adjustment changes exactly the same things a
// sale's stock deduction does.
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation<InventoryItem, AxiosError<{ error?: string }>, AdjustStockParams>({
    mutationFn: ({ id, ...data }) => adjustItemStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.current });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock });
    },
  });
}

// Removing an item from the catalogue entirely -- distinct from a WASTE
// adjustment (which zeroes its stock but keeps the item around). Same
// invalidations as a stock adjustment: an item disappearing changes the
// dashboard's item count/low-stock tiles too.
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ error?: string }>, string>({
    mutationFn: (id) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.current });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock });
    },
  });
}
