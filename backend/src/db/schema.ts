import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

export const eventTypeEnum = pgEnum("type", [
  "CREATE",
  "RESTOCK",
  "ADJUSTMENT",
  "SALE",
  "DELETE",
  "WASTE",
  "AUDIT",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "TRANSFER",
  "POS",
  "CHEQUE",
  "USSD",
]);

// Per-payment gateway state. Everything today is entered by a cashier and
// immediately marked CONFIRMED. The column exists now so a later real
// OPay/Paystack webhook integration can start writing PENDING -> CONFIRMED /
// FAILED itself without any schema change or migration of existing rows.
export const paymentConfirmationStatusEnum = pgEnum(
  "payment_confirmation_status",
  ["PENDING", "CONFIRMED", "FAILED"],
);

export const roleTypeEnum = pgEnum("role", ["ADMIN", "STAFF"]);

// FABRIC: sold by the yard/metre off a roll, described by design/color/dye lot/width.
// READY_MADE: a finished garment, sold as a whole piece, described by size.
export const itemTypeEnum = pgEnum("item_type", ["FABRIC", "READY_MADE"]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: roleTypeEnum().notNull().default("STAFF"),
  // Soft-delete flag, same pattern as categories.is_active/suppliers.is_active.
  // A user with any sales/inventory/payment/invite history can't be hard
  // deleted anyway -- those foreign keys are ON DELETE RESTRICT/NO ACTION
  // on purpose, so a past sale still shows who made it after they leave.
  // "Remove user" deactivates instead: login and token refresh both check
  // this and reject a deactivated account, without erasing their history.
  is_active: boolean("is_active").notNull().default(true),
  timestamp: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  item_type: itemTypeEnum().notNull().default("FABRIC"),
  // Fabric-specific attributes (nullable — irrelevant for READY_MADE items).
  design: text("design"),
  color: text("color"),
  width_inches: integer("width_inches"),
  dye_lot: text("dye_lot"),
  // Ready-made-specific attribute (nullable — irrelevant for FABRIC items).
  size: text("size"),
  // Groups variants of the same garment/design across sizes or dye lots so
  // the frontend can show "one product, N sizes/lots in stock" instead of
  // treating every size as an unrelated item. Left null for standalone items.
  style_code: text("style_code"),
  sku: text("sku").unique(),
  image_url: text("image_url"),
  category_id: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  unit: text("unit").notNull().default("yard"),
  current_stock: numeric("current_stock", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  low_stock_threshold: numeric("low_stock_threshold", { precision: 10, scale: 2 })
    .notNull()
    .default("5"),
  cost_price: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  selling_price: numeric("selling_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const itemImages = pgTable("item_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  item_id: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  is_primary: boolean("is_primary").notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  total_amount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  total_profit: numeric("total_profit", { precision: 12, scale: 2 }).notNull(),
  customer_name: text("customer_name"),
  customer_phone: text("customer_phone"),
  payment_method: text("payment_method").notNull().default("CASH"),
  payment_status: text("payment_status").notNull().default("PAID"),
  note: text("note"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const salesItems = pgTable("sales_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sale_id: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  item_id: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  price_per_unit: numeric("price_per_unit", {
    precision: 10,
    scale: 2,
  }).notNull(),
  cost_per_unit: numeric("cost_per_unit", {
    precision: 10,
    scale: 2,
  }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
});

export const payments = pgTable("payments", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sale_id: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum().notNull(),
  status: paymentConfirmationStatusEnum().notNull().default("CONFIRMED"),
  received_by: uuid("received_by").references(() => users.id, {
    onDelete: "restrict",
  }),
  // Populated by a gateway webhook in a future integration; a manually
  // logged payment leaves this null.
  reference: text("reference"),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  note: text("note"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryEvents = pgTable("inventory_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  item_id: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  type: eventTypeEnum().notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  prev_stock: numeric("prev_stock", { precision: 10, scale: 2 }).notNull(),
  new_stock: numeric("new_stock", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const invites = pgTable("invites", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  role: roleTypeEnum("role").default("STAFF").notNull(),
  invite_token: text("invite_token").notNull().unique(),
  invited_by: uuid("invited_by").references(() => users.id),
  expires_at: timestamp("expires_at"),
  accepted_at: timestamp("accepted_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token_hash: text("token_hash").notNull(),
  device_info: text("device_info"),
  revoked: boolean("revoked").notNull().default(false),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  replaced_by: uuid("replaced_by"),
});

export const inventoryEventsRelations = relations(
  inventoryEvents,
  ({ one }) => ({
    item: one(items, {
      fields: [inventoryEvents.item_id],
      references: [items.id],
    }),
    user: one(users, {
      fields: [inventoryEvents.user_id],
      references: [users.id],
    }),
  }),
);

export const itemsRelations = relations(items, ({ one, many }) => ({
  events: many(inventoryEvents),
  saleLines: many(salesItems),
  category: one(categories, {
    fields: [items.category_id],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(items),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.user_id],
    references: [users.id],
  }),
  lineItems: many(salesItems),
  payments: many(payments),
}));

export const salesItemsRelations = relations(salesItems, ({ one }) => ({
  sale: one(sales, {
    fields: [salesItems.sale_id],
    references: [sales.id],
  }),
  item: one(items, {
    fields: [salesItems.item_id],
    references: [items.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  sale: one(sales, {
    fields: [payments.sale_id],
    references: [sales.id],
  }),
  receivedBy: one(users, {
    fields: [payments.received_by],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  events: many(inventoryEvents),
  invites: many(invites),
  refreshTokens: many(refreshTokens),
  sales: many(sales),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  user: one(users, {
    fields: [invites.invited_by],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.user_id],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof salesItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InventoryEvent = typeof inventoryEvents.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;

export const insertItemSchema = createInsertSchema(items);
export const insertEventSchema = createInsertSchema(inventoryEvents);
export const insertUserSchema = createInsertSchema(users).strict();

export const UserSchema = createSelectSchema(users);
export const ItemSchema = createSelectSchema(items);
export const InventoryEventSchema = createSelectSchema(inventoryEvents);
export const InviteSchema = createSelectSchema(invites);
export const CategorySchema = createSelectSchema(categories);
export const SaleSchemaDb = createSelectSchema(sales);
