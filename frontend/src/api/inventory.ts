import api from "./axios";
import type { InventoryTotals, LowStockResponse } from "../types/api";

export const getInventoryTotals = async (): Promise<InventoryTotals> => {
  const res = await api.get<{ totals: InventoryTotals }>("/inventory/current");
  return res.data.totals;
};

export const getLowStock = async (): Promise<LowStockResponse> => {
  const res = await api.get<LowStockResponse>("/inventory/low-stock");
  return res.data;
};
