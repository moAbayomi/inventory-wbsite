import { db } from "./db.ts";
import { users } from "./schema.ts";
import { hashPassword } from "../utils/utils.ts";
import { eq } from "drizzle-orm";

// Production bootstrap -- creates exactly ONE admin account and nothing
// else: no sample categories, items, or sales (that's what seed.ts is
// for, in dev). Run this once against a brand new production database
// before going live. From then on, that admin invites every other user
// through the app's own Users page -- this script is never run again
// against that database (it refuses if the email already exists).
//
// Credentials come from environment variables instead of being hardcoded
// here, so a real password never sits in source control. Set all three
// before running, e.g.:
//   ADMIN_NAME="Abby" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a strong password" npm run db:seed:admin
async function seedProductionAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD.\n" +
        "Set all three environment variables before running this script, e.g.:\n" +
        '  ADMIN_NAME="Abby" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a strong password" npm run db:seed:admin',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("ADMIN_PASSWORD should be at least 8 characters.");
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.error(
      `A user with email ${email} already exists -- refusing to create a duplicate. ` +
        "Nothing was changed.",
    );
    process.exit(1);
  }

  const [admin] = await db
    .insert(users)
    .values({
      name,
      email,
      password_hash: await hashPassword(password),
      role: "ADMIN",
    })
    .returning();

  if (!admin) throw new Error("failed to create admin user");

  console.log(`Created admin account: ${admin.name} <${admin.email}>`);
  console.log("Log in with this account, then invite everyone else from the Users page.");
  process.exit(0);
}

seedProductionAdmin().catch((err) => {
  console.error("Failed to seed production admin:", err);
  process.exit(1);
});

export default seedProductionAdmin;
