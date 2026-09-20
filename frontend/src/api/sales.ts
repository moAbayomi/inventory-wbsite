import api from "./axios";
import type {
  Sale,
  SalesSummary,
  SalesListResponse,
  SaleDetail,
  SalesTimeseries,
} from "../types/api";
import type { NewSaleData } from "../schemas/sales";

export type SalesRange = "today" | "week" | "month";

export const createSale = async (data: NewSaleData): Promise<Sale> => {
  const res = await api.post<{ sale: Sale }>("/sales", data);
  return res.data.sale;
};

export const getSalesSummary = async (
  range: SalesRange = "today",
): Promise<SalesSummary> => {
  const res = await api.get<SalesSummary>("/sales/summary", {
    params: { range },
  });
  return res.data;
};

export const getSalesTimeseries = async (
  range: SalesRange = "week",
): Promise<SalesTimeseries> => {
  const res = await api.get<SalesTimeseries>("/sales/timeseries", {
    params: { range },
  });
  return res.data;
};

export interface ListSalesParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  status?: "PAID" | "PARTIAL" | "UNPAID";
}

export const listSales = async (
  params: ListSalesParams = {},
): Promise<SalesListResponse> => {
  const res = await api.get<SalesListResponse>("/sales", { params });
  return res.data;
};

export const getSaleDetail = async (id: string): Promise<SaleDetail> => {
  const res = await api.get<SaleDetail>(`/sales/${id}`);
  return res.data;
};
