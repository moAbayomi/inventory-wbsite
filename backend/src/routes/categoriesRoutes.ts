import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.ts";
import {
  newCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "../schemas/category.schema.ts";
import {
  listCategories,
  newCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoriesController.ts";

const router = Router();

router.get("/", authenticateToken, validateQuery(listCategoriesQuerySchema), listCategories);
router.post("/", authenticateToken, validateBody(newCategorySchema), newCategory);
router.patch(
  "/:id",
  authenticateToken,
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  updateCategory,
);
router.delete("/:id", authenticateToken, validateParams(categoryIdParamSchema), deleteCategory);

export default router;
