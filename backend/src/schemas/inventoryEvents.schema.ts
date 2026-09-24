import { z } from "zod";

export const inventoryEventIdParamSchema = z.object({
  id: z.uuid()
})

export type InventoryEventIdParam = z.infer<typeof inventoryEventIdParamSchema>

// Powers the events/activity history page's filters: what kind of
// movement (a sale, a restock, a physical audit, ...), and/or a date
// range, with real pagination (getAllEvents used to only take `limit`,
// capped at 100, with no way to page past the newest 100 events at all).
export const listEventsQuerySchema = z.object({
  type: z
    .enum(["CREATE", "RESTOCK", "ADJUSTMENT", "SALE", "DELETE", "WASTE", "AUDIT"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
