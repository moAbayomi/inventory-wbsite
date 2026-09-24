import type { Request, Response, NextFunction } from "express";
import { db } from "../db/db.ts";
import { eq, desc, type InferSelectModel } from "drizzle-orm";
import { users } from "../db/schema.ts";

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
			.where(eq(users.id, id))
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
    }).where(eq(users.id, id)).returning()

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


// Soft delete, same reasoning as categoriesController.deleteCategory: a
// user who has ever made a sale, logged an inventory event, received a
// payment, or sent an invite is referenced by rows that are ON DELETE
// RESTRICT/NO ACTION on purpose -- a hard DELETE FROM users would fail on
// basically any real staff account with a raw, unhelpful 500, which is
// exactly what "I can't remove a user, nothing happens" turned out to be.
// Deactivating instead matches what the confirmation dialog already
// promises ("revoke their access, they won't be able to sign in") without
// erasing who did what in the sales/activity history.
export const deleteUser = async function (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };

    if (req.user?.sub === id) {
      throw forbidden("You cannot deactivate your own account");
    }

    const [deactivatedUser] = await db
      .update(users)
      .set({ is_active: false })
      .where(eq(users.id, id))
      .returning();

    if (!deactivatedUser) {
      throw notFound("User not found");
    }

    return res.status(200).json({
      message: "User deactivated successfully",
      userId: deactivatedUser.id,
    });
  } catch (e) {
    console.error("Failed to deactivate user:", e);
    next(e);
  }
};
