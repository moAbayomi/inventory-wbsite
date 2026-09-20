import type { Request, Response, NextFunction } from "express";
import { invites, users } from "../db/schema.ts";
import { db } from "../db/db.ts";
import { eq, isNull, gt, and } from "drizzle-orm";
import {
  generateRandomToken,
  hashPassword,
  hashToken,
} from "../utils/utils.ts";
import { env } from "../../env.ts";
import { sendEmail } from "../services/email.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import type {
  AcceptInviteInput,
  CreateInviteInput,
} from "../schemas/invite.schema.ts";
import {
  badRequest,
  conflict,
  internal,
  unauthorized,
} from "../utils/httpError.ts";

export const inviteUser = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, role } = req.body as CreateInviteInput;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser) throw conflict("user with this email already exists");

    const [pendingInvite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, email),
          isNull(invites.accepted_at),
          gt(invites.expires_at, new Date()),
        ),
      )
      .limit(1);
    if (pendingInvite)
      throw badRequest("an invite has already been sent to this email");

    const inviteToken = generateRandomToken();
    const tokenHash = hashToken(inviteToken);
    const tokenExpiry = new Date(
      Date.now() + env.INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const [newInvite] = await db
      .insert(invites)
      .values({
        email: email,
        role: role,
        invite_token: tokenHash,
        invited_by: req.user?.sub,
        expires_at: tokenExpiry,
      })
      .returning();

    if (!newInvite) {
      throw badRequest("failed to create invite");
    }

    const inviteLink = `${env.FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}`;

    //send email function right here. right now
    const html = `
      <p>You've been invited to Sweevo.</p>
      <p><a href="${inviteLink}">Accept your invite</a></p>
      <p>This link expires in 7 days.</p>
    `;
    const emailSend = await sendEmail(
      email,
      "You have been sent this invite. You are welcome!",
      html,
    );

    if (!emailSend.success) {
      throw internal("couldnt send email");
    }

    return res.status(201).json({
      invite: {
        message: "invite sent successfully",
        id: newInvite.id,
        email: newInvite.email,
        expires_at: newInvite.expires_at,
      },
      emailSent: emailSend.success,
    });
  } catch (e) {
    console.error("coundlnt invite user", e);
    next(e);
  }
};

export const acceptInvite = async function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token, name, password } = req.body as AcceptInviteInput;

    const tokenHash = hashToken(token);

    const result = await db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.invite_token, tokenHash),
            isNull(invites.accepted_at),
            gt(invites.expires_at, new Date()),
          ),
        )
        .limit(1);
      if (!invite) throw new Error("INVALID_INVITE");

      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, invite.email))
        .limit(1);

      if (existingUser) throw new Error("EMAIL_ALREADY_REGISTERED");

      const hashedPassword = await hashPassword(password);

      const [newUser] = await tx
        .insert(users)
        .values({
          name: name,
          email: invite.email,
          password_hash: hashedPassword,
          role: invite.role,
        })
        .returning();

      if (!newUser) throw new Error("USER_CREATION_FAILED");

      await tx
        .update(invites)
        .set({
          accepted_at: new Date(),
        })
        .where(eq(invites.id, invite.id));

      return newUser;
    });

    const { password_hash: _, ...safeUser } = result;

    return res
      .status(200)
      .json({ message: "user created successfully", user: safeUser });
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      switch (e.message) {
        case "INVALID_INVITE":
          return next(unauthorized("invalid or expired email link"));
        case "EMAIL_ALREADY_REGISTERED":
          return next(badRequest("This email is already registered"));
        case "USER_CREATION_FAILED":
          return next(internal("Failed to create user."));
      }
    }
    next(e);
  }
};
