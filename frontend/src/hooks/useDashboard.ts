import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { inventoryKeys, salesKeys } from "../queries/keys";
import { getInventoryTotals, getLowStock } from "../api/inventory";
import { getSalesSummary, getSalesTimeseries, type SalesRange } from "../api/sales";
import { useAuth } from "./useAuth";

// Recent activity isn't here yet — see the note at the top of
// src/api/activity.ts for why (the backend has no route for it today).
//
// The three tiles below are deliberately GET /inventory/current,
// GET /inventory/low-stock, and GET /sales/summary — that's the exact set
// Day 3 asks for. Categories used to sit in the third slot; moved out (still
// available via useCategory() on the Categories page) since it isn't one of
// the three endpoints this screen is supposed to be wired to.
//
// `range` now drives both the "Sales today" tile and the revenue chart —
// one filter control on the page, not two that could disagree.

export function useDashboard(range: SalesRange = "today") {
  const { user } = useAuth();

  const totals = useQuery({
    queryKey: inventoryKeys.current,
    queryFn: getInventoryTotals,
    enabled: !!user,
    staleTime: 30_000,
  });

  const lowStock = useQuery({
    queryKey: inventoryKeys.lowStock,
    queryFn: getLowStock,
    enabled: !!user,
    staleTime: 30_000,
  });

  const salesSummary = useQuery({
    queryKey: salesKeys.summary(range),
    queryFn: () => getSalesSummary(range),
    enabled: !!user,
    staleTime: 30_000,
    // Each range is its own query key, so switching to one that's never
    // been fetched this session has no cache yet -- without this, that's a
    // real (if brief) isLoading:true, which was blanking the *entire*
    // dashboard back to a spinner on every Today/Week/Month click, not
    // just the two tiles that actually depend on `range`. This keeps
    // showing the previous range's numbers in place while the new ones
    // load in the background, so nothing on screen disappears.
    placeholderData: keepPreviousData,
  });

  const timeseries = useQuery({
    queryKey: salesKeys.timeseries(range),
    queryFn: () => getSalesTimeseries(range),
    enabled: !!user,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return {
    totals: totals.data ?? null,
    lowStock: lowStock.data ?? null,
    salesSummary: salesSummary.data ?? null,
    timeseries: timeseries.data ?? null,
    isLoading:
      totals.isLoading ||
      lowStock.isLoading ||
      salesSummary.isLoading ||
      timeseries.isLoading,
    isError:
      totals.isError || lowStock.isError || salesSummary.isError || timeseries.isError,
  };
}
