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

// A delivery came in (RESTOCK), some fabric was damaged (WASTE), or a quick
// correction (ADJUSTMENT) -- not a sale, and not a physical count (that's
// /items/:id/audit instead). See backend/src/schemas/item.schema.ts's
// adjustStockInput for the exact shape this mirrors.
export const adjustItemStock = async (
  id: string,
  data: { quantity: number; type: "RESTOCK" | "WASTE" | "ADJUSTMENT"; note?: string },
): Promise<InventoryItem> => {
  const res = await api.post<{ item: InventoryItem }>(`/items/${id}/adjust`, data);
  return res.data.item;
};

// Hard delete on the backend (itemsController.ts's deleteItem) -- it logs a
// DELETE inventory_events row with the item's stock at the time first, so
// the item disappearing doesn't erase the fact that it existed from the
// event history, even though the item row itself is gone.
export const deleteItem = async (id: string): Promise<void> => {
  await api.delete(`/items/${id}`);
};
