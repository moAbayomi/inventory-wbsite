import { z } from "zod";

export const newCategorySchema = z.object({
  name: z.string().min(2, "category name must be at least two characters"),
  description: z.string().optional(),
});
export type NewCategoryInput = z.infer<typeof newCategorySchema>;

export const updateCategorySchema = newCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
    path: ["_global"],
  });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdParamSchema = z.object({
  id: z.uuid(),
});
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;

export const listCategoriesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
