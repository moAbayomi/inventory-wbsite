import db from "../../src/db/db.ts";
import {
  users,
  items,
  categories,
  sales,
  salesItems,
  payments,
  inventoryEvents,
  type NewUser,
  type NewItem,
  type NewCategory,
  refreshTokens,
} from "../../src/db/schema.ts";
import { internal } from "../../src/utils/httpError.ts";
import { generateAccessToken, hashPassword, hashToken } from "../../src/utils/utils.ts";
import { nanoid } from "nanoid";

export const createTestUser = async (userData: Partial<NewUser> = {}) => {
  const defaultUserData = {
    name: "Test User",
    password_hash: "adminpassword1234",
    email: `test-${Date.now()}-${nanoid(6)}@example.com`.toLowerCase(),
    ...userData
  }

  const hashedPassword = await hashPassword(defaultUserData.password_hash)
  const [user] = await db.insert(users).values(
    {
      ...defaultUserData,
      role: defaultUserData.role,
      password_hash: hashedPassword,
      timestamp: defaultUserData.timestamp
    }
  ).returning()
  if(!user) throw internal()

  const token = await generateAccessToken({
    sub: user.id,
    role: user.role
  })

  return {token, user, password: defaultUserData.password_hash}
}

export const createTestCategory = async (categoryData: Partial<NewCategory> = {}) => {
  const defaultCategory = {
    name: `Test Category ${Date.now()}-${nanoid(4)}`,
    ...categoryData,
  };

  const [category] = await db.insert(categories).values(defaultCategory).returning();
  if (!category) throw internal("Failed to create test category.");

  return category;
};

// cost_price/selling_price are NOT NULL with no default on the items
// table -- a test item created without them fails immediately. This
// previously used `currentStock` (camelCase, wrong -- the column is
// current_stock) and never supplied a price at all.
export const createTestItem = async (itemData: Partial<NewItem> = {}) => {
  const defaultItem = {
    name: "TestItem",
    sku: `SKU-${Date.now()}-${nanoid(4)}`,
    unit: "yard",
    current_stock: "10.00",
    low_stock_threshold: "5.00",
    cost_price: "500.00",
    selling_price: "800.00",
    description: null,
    ...itemData,
   }

  const [item] = await db.insert(items).values(defaultItem).returning()

  if (!item) throw internal("Failed to create new item.")

  return item
}

// Builds a fully-recorded sale (sale + sales_items + payment + inventory
// event + stock decrement) directly, bypassing the API, for tests that
// need an existing sale to read back rather than to exercise POST /sales
// itself.
export const createTestSale = async (opts: {
  user_id: string;
  item: Awaited<ReturnType<typeof createTestItem>>;
  quantity?: string;
  customer_name?: string;
}) => {
  const quantity = opts.quantity ?? "1.00";
  const subtotal = (Number(opts.item.selling_price) * Number(quantity)).toFixed(2);
  const profit = (
    (Number(opts.item.selling_price) - Number(opts.item.cost_price)) *
    Number(quantity)
  ).toFixed(2);

  const [sale] = await db
    .insert(sales)
    .values({
      user_id: opts.user_id,
      total_amount: subtotal,
      total_profit: profit,
      customer_name: opts.customer_name ?? null,
      payment_method: "CASH",
      payment_status: "PAID",
    })
    .returning();
  if (!sale) throw internal("Failed to create test sale.");

  await db.insert(salesItems).values({
    sale_id: sale.id,
    item_id: opts.item.id,
    quantity,
    price_per_unit: opts.item.selling_price,
    cost_per_unit: opts.item.cost_price,
    subtotal,
    profit,
  });

  await db.insert(payments).values({
    sale_id: sale.id,
    amount: subtotal,
    method: "CASH",
    status: "CONFIRMED",
    received_by: opts.user_id,
  });

  return sale;
};

// Deliberately does NOT delete `users`: most test files create one user
// once in `beforeAll` and reuse its token across every `it` in the file,
// relying on afterEach(cleanupDb) to only clear the per-test data. Deleting
// users here would break that user's later requests (inventory_events.user_id
// is NOT NULL + ON DELETE RESTRICT, so the very next insert referencing the
// now-gone user would fail its foreign key) and is why the original version
// of this helper never touched the users table either.
export const cleanupDb = async () => {
  // Children before parents so no foreign key blocks the delete.
  await db.delete(payments)
  await db.delete(salesItems)
  await db.delete(sales)
  await db.delete(inventoryEvents)
  await db.delete(items)
  await db.delete(categories)
  await db.delete(refreshTokens)
}
