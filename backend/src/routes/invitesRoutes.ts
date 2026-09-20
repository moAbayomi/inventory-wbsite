import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { adminOnly } from "../middleware/adminOnly.ts";
import { validateBody } from "../middleware/validation.ts";
import { acceptInviteSchema, createInviteSchema } from "../schemas/invite.schema.ts"; 
import { acceptInvite, inviteUser } from "../controllers/invitesController.ts";


const router = Router()

router.post("/accept", validateBody(acceptInviteSchema), acceptInvite);
router.post("/", authenticateToken, adminOnly, validateBody(createInviteSchema), inviteUser);
export default router
