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

    // Absolute URL, not a relative "/logo.jpg" -- email clients render
    // this in an inbox with no access to the app's own origin, so it has
    // to be a fully-qualified link the client can fetch on its own.
    // FRONTEND_URL already exists for the invite link itself; once that's
    // set to the real production domain, the logo resolves there too with
    // no further change.
    const logoUrl = `${env.FRONTEND_URL}/logo.jpg`;

    //send email function right here. right now
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px; text-align: center; color: #1C1C1A;">
        <img src="${logoUrl}" alt="Abby's Robe" width="64" height="64" style="border-radius: 9999px; object-fit: cover; margin-bottom: 12px;" />
        <h1 style="font-size: 18px; margin: 0 0 4px;">Abby's Robe</h1>
        <p style="font-size: 14px; color: #57534E; margin: 0 0 24px;">You've been invited to join the team.</p>
        <a href="${inviteLink}" style="display: inline-block; background: #17171A; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Accept your invite
        </a>
        <p style="font-size: 12px; color: #78716C; margin-top: 24px;">
          This link expires in 7 days. If the button doesn't work, copy this link:<br />
          <a href="${inviteLink}" style="color: #57534E;">${inviteLink}</a>
        </p>
      </div>
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
