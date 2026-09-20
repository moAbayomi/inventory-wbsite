import db from "../../src/db/db.ts";
import {
  users,
  inventoryEvents,
  items,
  invites,
  refreshTokens,
  categories,
  sales,
  salesItems,
  payments,
  suppliers,
  itemImages,
} from "../../src/db/schema.ts";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

// Drop order matters: children (things with a foreign key pointing at
// another table) before parents, or CASCADE handles the rest. Listed
// explicitly anyway so it's obvious what a clean test run actually resets.
async function dropAll() {
  await db.execute(sql`DROP TABLE IF EXISTS ${payments} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${salesItems} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${sales} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${itemImages} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${inventoryEvents} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${items} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${categories} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${suppliers} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${invites} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${refreshTokens} CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS ${users} CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS "type" CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS "payment_method" CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS "payment_confirmation_status" CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS "role" CASCADE`);
  await db.execute(sql`DROP TYPE IF EXISTS "item_type" CASCADE`);
}

export default async function setup() {
  console.log("setting up the database");

  try {
    await dropAll();

    console.log("pushing schema using drizzle-kit");
    execSync(
      `npx drizzle-kit push --url="${process.env.DATABASE_URL}" --schema="./src/db/schema.ts" --dialect="postgresql"`,
      {
        stdio: "inherit",
        cwd: process.cwd(),
        timeout: 60000,
      },
    );

    console.log("TEST DB created");
  } catch (e) {
    console.error("failed to make test db", e);
    throw e;
  }

  return async () => {
    try {
      await dropAll();
      process.exit(0);
    } catch (e) {
      console.error("failed to tear down test db", e);
      throw e;
    }
  };
}
