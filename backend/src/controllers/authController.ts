import type { NextFunction, Request, Response } from "express";
import { db } from "../db/db.ts";
import { users, type NewUser, refreshTokens } from "../db/schema.ts";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  hashPassword,
  comparePassword,
} from "../utils/utils.ts";
import { eq } from "drizzle-orm";
import { env, isProd } from "../../env.ts";
import {
  badRequest,
  internal,
  notFound,
  unauthorized,
} from "../utils/httpError.ts";

// "lax" only sends the cookie on same-site requests. That's invisible in
// dev (frontend and backend both live on localhost through Vite's proxy),
// but it silently breaks login/refresh the moment frontend and backend are
// hosted on different domains, which is the normal outcome of "host them
// separately" -- the cross-site fetch calls this app makes to /auth/refresh
// just never carry the cookie, and every session dies on its first token
// refresh. "none" is required for a cross-origin cookie, and it's a safe
// choice even when they DO share an origin -- it's the strictly weaker
// setting either way. Browsers reject "none" without secure:true, which
// isProd() already guarantees whenever this is "none", so the pairing is
// never unsafe.
const cookieSameSite = () => (isProd() ? ("none" as const) : ("lax" as const));

export const register = async (
  req: Request<any, any, NewUser>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password_hash } = req.body;
    const hashedPassword = await hashPassword(password_hash);
    const [user] = await db
      .insert(users)
      .values({
        ...req.body,
        password_hash: hashedPassword,
      })
      .returning({
        id: users.id,
        role: users.role,
      });

    if (!user) throw internal();

    const token = await generateAccessToken({
      sub: user?.id,
      role: user.role,
    });

    res.status(201).json({
      message: "user created",
      user,
      token,
    });
  } catch (e) {
    next(e);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, device_info } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return res.status(401).json({ error: "invalid request" });

    const isValidatedPassword = await comparePassword(
      password,
      user.password_hash,
    );
    if (!isValidatedPassword) throw badRequest("Enter Valid Password");

    // A deactivated account ("Remove user" in the Users page -- see
    // usersController.deleteUser) still has a valid password, so this has
    // to be checked separately after the password check, not folded into
    // the !user case above.
    if (!user.is_active) {
      throw unauthorized("This account has been deactivated");
    }

    const accessToken = await generateAccessToken({
      sub: user.id,
      role: user.role,
    });
    const refreshPlain = generateRefreshToken();
    const refreshHash = hashToken(refreshPlain);

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_EXPIRES_DAYS,
    );

    await db.insert(refreshTokens).values({
      user_id: user.id,
      token_hash: refreshHash,
      device_info: device_info ?? null,
      expires_at: expiresAt,
    });

    // secure must follow isProd(): the dev/test environment isn't served
    // over https, so a cookie that only travels over https would never be
    // set locally -- but hardcoding false (as this used to) means the
    // cookie is also sent unencrypted once this really is in production.
    res.cookie("refreshToken", refreshPlain, {
      httpOnly: true,
      secure: isProd(),
      sameSite: cookieSameSite(),
      maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const tokenHash = hashToken(token);
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.token_hash, tokenHash));
    }

    // clearCookie must be called with the same attributes the cookie was
    // set with, or the browser treats it as a different cookie and never
    // actually clears the one that's there.
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd(),
      sameSite: cookieSameSite(),
      path: "/",
    });

    res.status(200).json({ message: "user logged out successfully" });
  } catch (e) {
    next(e);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) throw unauthorized();

    const tokenHash = hashToken(token);
    const [tokenRow] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token_hash, tokenHash))
      .limit(1);
    if (!tokenRow || tokenRow.revoked) {
      throw unauthorized("invalid refresh token");
    }

    if (tokenRow && new Date(tokenRow.expires_at) < new Date()) {
      throw unauthorized("expired token");
    }

    const newPlain = generateRefreshToken();
    const newHash = hashToken(newPlain);
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * env.REFRESH_TOKEN_EXPIRES_DAYS,
    );

    await db.transaction(async (tx) => {
      const [newInsertedToken] = await tx
        .insert(refreshTokens)
        .values({
          user_id: tokenRow.user_id,
          token_hash: newHash,
          device_info: tokenRow.device_info,
          expires_at: expiresAt,
        })
        .returning({ id: refreshTokens.id });

      if (!newInsertedToken) throw notFound("token not found");

      await tx
        .update(refreshTokens)
        .set({
          revoked: true,
          replaced_by: newInsertedToken.id,
        })
        .where(eq(refreshTokens.id, tokenRow.id));
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRow.user_id))
      .limit(1);

    if (!user) throw unauthorized();
    // Catches the case where an admin deactivates someone mid-session: the
    // short-lived access token they already have keeps working until it
    // expires, but the next refresh -- which happens automatically, see
    // frontend/src/api/axios.ts -- is where a deactivated account actually
    // gets locked out.
    if (!user.is_active) throw unauthorized("This account has been deactivated");
    const accessToken = await generateAccessToken({ sub: user.id, role: user.role });

    res.cookie("refreshToken", newPlain, {
      httpOnly: true,
      secure: isProd(),
      sameSite: cookieSameSite(),
      maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
};
