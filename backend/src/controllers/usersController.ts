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

    const { name, role } = req.body as UpdateUserBody

    const [user] = await db.update(users).set({
      name: name,
      role: role
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

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deletedUser) {
      throw notFound("User not found");
    }

    return res.status(200).json({
      message: "User deleted successfully",
      userId: deletedUser.id,
    });
  } catch (e) {
    console.error("Failed to delete user:", e);
    next(e);
  }
};
