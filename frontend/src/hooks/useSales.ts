import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  createSale,
  listSales,
  getSaleDetail,
  getSalesTimeseries,
  type ListSalesParams,
  type SalesRange,
} from "../api/sales";
import type { NewSaleData } from "../schemas/sales";
import type { Sale } from "../types/api";
import { itemKeys, inventoryKeys, salesKeys } from "../queries/keys";

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation<Sale, AxiosError<{ error?: string }>, NewSaleData>({
    mutationFn: createSale,
    onSuccess: () => {
      // A sale changes four things at once: the item's stock (itemKeys),
      // the dashboard's totals/low-stock tiles (inventoryKeys), and the
      // sales-today tile (salesKeys). Invalidating all four is the entire
      // mechanism behind Day 3's "dashboard updates without a refresh" —
      // there's no manual "now go update the dashboard" code anywhere;
      // each screen just refetches because its query key got marked stale.
      queryClient.invalidateQueries({ queryKey: itemKeys.list });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.current });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock });
      // Prefix keys -- clears every range variant of both the summary
      // tiles and the dashboard chart in one call, regardless of which
      // range happens to be selected right now.
      queryClient.invalidateQueries({ queryKey: salesKeys.summaryAll });
      queryClient.invalidateQueries({ queryKey: salesKeys.timeseriesAll });
      // Any params, since a new sale should bump every page/filter of the
      // history list back to "possibly stale" -- cheaper than trying to
      // predict which specific param combos it affects.
      queryClient.invalidateQueries({ queryKey: ["sales", "list"] });
    },
  });
}

export function useSalesTimeseries(range: SalesRange = "week") {
  return useQuery({
    queryKey: salesKeys.timeseries(range),
    queryFn: () => getSalesTimeseries(range),
    staleTime: 30_000,
  });
}

export function useSalesList(params: ListSalesParams = {}) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => listSales(params),
  });
}

export function useSaleDetail(id: string | undefined) {
  return useQuery({
    queryKey: salesKeys.detail(id ?? ""),
    queryFn: () => getSaleDetail(id as string),
    enabled: !!id,
  });
}
