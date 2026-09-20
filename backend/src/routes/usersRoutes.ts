import { Router } from "express";
import { adminOnly } from "../middleware/adminOnly.ts";
import { authenticateToken } from "../middleware/auth.ts";
import { selfOrAdmin } from "../middleware/selfOrAdmin.ts";
import { updateUser, deleteUser, getUser, listUsers } from "../controllers/usersController.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.ts";
import { listQuerySchema, updateUserSchema, userIdParamSchema } from "../schemas/user.schema.ts";

const router = Router();

router.get("/", authenticateToken, adminOnly, validateQuery(listQuerySchema), listUsers);
router.get("/:id", authenticateToken, selfOrAdmin, validateParams(userIdParamSchema), getUser);
router.patch("/:id", authenticateToken, adminOnly, validateParams(userIdParamSchema), validateBody(updateUserSchema), updateUser);
router.delete("/:id", authenticateToken, adminOnly, validateParams(userIdParamSchema), deleteUser);

export default router;
