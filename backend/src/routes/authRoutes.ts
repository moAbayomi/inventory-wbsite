import { Router } from "express";
import { validateBody } from "../middleware/validation.ts";
import { login, refresh, logout } from "../controllers/authController.ts";
import { z } from "zod";

const loginSchema = z.object({
	email: z.email("invalid email"),
	password: z.string().min(4, "password is required"),
});

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
export default router;
