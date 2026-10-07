import api from "./axios";
import type { InventoryItem, ItemEvent } from "../types/api";
import type { ItemCreateData, ItemEditData } from "../schemas/items";

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const res = await api.get<{ items: InventoryItem[] }>("/items");
  const { items } = res.data;
  return items;
};

export const getItem = async (id: string): Promise<InventoryItem> => {
  const res = await api.get<{ item: InventoryItem }>(`/items/${id}`);
  return res.data.item;
};

// An item's stock history (sales, restocks, waste, ...), newest first.
export const getItemEvents = async (id: string): Promise<ItemEvent[]> => {
  const res = await api.get<{ events?: ItemEvent[] }>(`/events/items/${id}`);
  return res.data.events ?? [];
};

export const createItem = async (
  data: ItemCreateData,
): Promise<InventoryItem> => {
  const res = await api.post<{ item: InventoryItem }>("/items", data);
  return res.data.item;
};

// image_url: null (rather than leaving it out) is how an edit removes an
// item's photo -- see backend/src/schemas/item.schema.ts.
export const editItem = async (
  id: string,
  data: Omit<ItemEditData, "image_url"> & { image_url?: string | null },
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

// Uploads a photo straight to the image bucket (Cloudflare R2), not through
// our API: the backend hands out a short-lived signed URL, the file is PUT
// there, and what comes back is the public URL to save as image_url. Plain
// fetch for the PUT, not the `api` axios instance -- that one would attach
// our bearer token and base URL to a request going to a different host.
export const uploadItemImage = async (image: Blob): Promise<string> => {
  const res = await api.post<{ upload_url: string; public_url: string }>(
    "/items/images/upload-url",
    { content_type: image.type, size: image.size },
  );
  const { upload_url, public_url } = res.data;

  const put = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": image.type },
    body: image,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  return public_url;
};
