import type { Request, Response, NextFunction } from "express";
import { db } from "../db/db.ts";
import { eq, desc, and, isNull, sql, type InferSelectModel } from "drizzle-orm";
import {
  users,
  sales,
  inventoryEvents,
  payments,
  invites,
  refreshTokens,
} from "../db/schema.ts";

import type { ListQuery, IdParam, UpdateUserBody } from "../schemas/user.schema.ts";
import type { AuthenticatedRequest } from "../middleware/auth.ts";
import { forbidden, internal, notFound } from "../utils/httpError.ts";

type PublicUser = InferSelectModel<typeof users>;


export const listUsers = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
  try {
    console.log('📋 listUsers handler started');

    const { page, pageSize } = req.query as unknown as ListQuery;

		const offset = (page - 1) * pageSize;

		const usersList = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				is_active: users.is_active,
				timestamp: users.timestamp,
			})
			.from(users)
			.where(isNull(users.deleted_at))
			.orderBy(desc(users.timestamp))
			.limit(pageSize)
			.offset(offset);

    return res.status(200).json({
			users: usersList as PublicUser[],
			meta: {
				page,
				pageSize,
			},
		});
	} catch (e) {
		console.error("Some error", e);
		next(e);
	}
};

export const getUser = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const {id} = req.params as unknown as IdParam;

    const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				is_active: users.is_active,
				timestamp: users.timestamp,
			})
			.from(users)
			.where(and(eq(users.id, id), isNull(users.deleted_at)))
			.limit(1);

		if (!user) throw notFound("user not found");

		return res.status(200).json({ user });
	} catch (e) {
		console.error("Error in getUser controller:", e);
		next(e);
	}
};

export const createUser = async function (req: Request, res: Response, next: NextFunction) {
  try {
    const [newUser] = await db.insert(users).values(req.body).returning();
    if (!newUser) throw internal("failed")

    const { password_hash: _, ...safeUser } = newUser;

    return res.status(201).json({message: "user created", user: safeUser})
  } catch (e) {
    console.error("failed making user. woefully", e);
    next(e);
  }
}

export const updateUser = async function (req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as unknown as IdParam;

    // Reactivating (is_active: true) goes through this same PATCH endpoint
    // rather than a separate route -- it's just another field update.
    // Drizzle drops any key here that's `undefined` from the generated
    // UPDATE, so sending just {role: "ADMIN"} (without name/is_active)
    // doesn't null the other columns out.
    const { name, role, is_active } = req.body as UpdateUserBody

    const [user] = await db.update(users).set({
      name,
      role,
      is_active,
    }).where(and(eq(users.id, id), isNull(users.deleted_at))).returning()

    if(!user) throw notFound("user not found")

    const { password_hash: _, ...safeUser } = user;
      return res.status(200).json({
        message: "user updated successfully",
        user: safeUser
      })


  } catch (e) {
    console.error(e);
    next(e)
  }
}


// Deleting a user, without losing history. A user who has ever made a
// sale, logged a stock movement, received a payment or sent an invite is
// referenced by those rows (ON DELETE RESTRICT/NO ACTION on purpose), and
// the activity feed, sales history and receipts show their name. So:
//
// - No history: the row is deleted outright (their refresh tokens go with
//   it via ON DELETE CASCADE, so any open session can't be renewed).
// - Has history: the row stays so every past record still shows their
//   name, but the account is erased -- deleted_at set, email and password
//   replaced so it can never sign in and the address can be invited again,
//   sessions revoked, and it disappears from the users list.
//
// Deactivating (PATCH is_active: false) is still there for a reversible
// "pause this account".
export const deleteUser = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };

    if (req.user?.sub === id) {
      throw forbidden("You cannot delete your own account");
    }

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), isNull(users.deleted_at)))
        .for("update")
        .limit(1);
      if (!user) throw notFound("User not found");

      const { rows } = await tx.execute<{ has_history: boolean }>(sql`
        select (
          exists (select 1 from ${sales} where ${sales.user_id} = ${id})
          or exists (select 1 from ${inventoryEvents} where ${inventoryEvents.user_id} = ${id})
          or exists (select 1 from ${payments} where ${payments.received_by} = ${id})
          or exists (select 1 from ${invites} where ${invites.invited_by} = ${id})
        ) as has_history
      `);
      const hasHistory = rows[0]?.has_history === true;

      if (!hasHistory) {
        await tx.delete(users).where(eq(users.id, id));
        return "deleted" as const;
      }

      await tx
        .update(users)
        .set({
          deleted_at: new Date(),
          is_active: false,
          // Unique per user and on a reserved domain (.invalid can never
          // receive mail), so it can't collide with or match a real address.
          email: `deleted-${id}@deleted.invalid`,
          // Not a bcrypt hash, so no password can ever match it.
          password_hash: "!deleted",
        })
        .where(eq(users.id, id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.user_id, id));
      return "archived" as const;
    });

    return res.status(200).json({
      message: "User deleted successfully",
      userId: id,
      // "archived": kept (name only) because past records point at them.
      result,
    });
  } catch (e) {
    console.error("Failed to delete user:", e);
    next(e);
  }
};
