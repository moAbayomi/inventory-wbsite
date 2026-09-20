import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type { Response, NextFunction } from "express";
import db from "../db/db.ts";
import { categories } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { notFound, internal } from "../utils/httpError.ts";
import type {
  NewCategoryInput,
  UpdateCategoryInput,
  CategoryIdParam,
  ListCategoriesQuery,
} from "../schemas/category.schema.ts";

export const listCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { includeInactive } = req.query as unknown as ListCategoriesQuery;

    const rows = includeInactive
      ? await db.select().from(categories)
      : await db.select().from(categories).where(eq(categories.is_active, true));

    res.status(200).json({ categories: rows, count: rows.length });
  } catch (e) {
    next(e);
  }
};

export const newCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = req.body as NewCategoryInput;

    const [category] = await db.insert(categories).values(data).returning();
    if (!category) throw internal("category could not be created");

    res.status(201).json({ message: "category created", category });
  } catch (e) {
    next(e);
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as unknown as CategoryIdParam;
    const data = req.body as UpdateCategoryInput;

    const [category] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();

    if (!category) throw notFound("category not found");

    res.status(200).json({ message: "category updated", category });
  } catch (e) {
    next(e);
  }
};

// Soft delete: items keep their category_id (and their history stays
// meaningful) but the category drops out of the default list. A hard
// DELETE would be safe too (items.category_id is ON DELETE SET NULL) but
// would erase which category a past sale/item used to belong to.
export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as unknown as CategoryIdParam;

    const [category] = await db
      .update(categories)
      .set({ is_active: false })
      .where(eq(categories.id, id))
      .returning();

    if (!category) throw notFound("category not found");

    res.status(200).json({ message: "category deactivated", category });
  } catch (e) {
    next(e);
  }
};
