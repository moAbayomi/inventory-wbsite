import { z } from "zod";

export const inventoryEventIdParamSchema = z.object({
  id: z.uuid()
})

export type InventoryEventIdParam = z.infer<typeof inventoryEventIdParamSchema>
