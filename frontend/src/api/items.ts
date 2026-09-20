import api from "./axios";
import type { InventoryItem } from "../types/api";
import type { ItemCreateData, ItemEditData } from "../schemas/items";

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const res = await api.get<{ items: InventoryItem[] }>("/items");
  const { items } = res.data;
  return items;
};

export const createItem = async (
  data: ItemCreateData,
): Promise<InventoryItem> => {
  const res = await api.post<{ item: InventoryItem }>("/items", data);
  return res.data.item;
};

export const editItem = async (
  id: string,
  data: ItemEditData,
): Promise<InventoryItem> => {
  const res = await api.patch<{ item: InventoryItem }>(`/items/${id}`, data);
  return res.data.item;
};
