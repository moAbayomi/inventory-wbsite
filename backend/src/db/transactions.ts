// NOTE: unused. adjustItemStock() (src/controllers/itemsController.ts) and
// the stock-decrement logic inside newSale() (src/controllers/salesController.ts)
// now do this inline with row locking, which this helper never had. Safe to
// delete -- kept only because nothing currently removes files on the
// device bridge without an explicit delete permission grant.
import { db } from "./db.ts";
import { sql, eq } from "drizzle-orm";
import { items, inventoryEvents } from "./schema.ts";

async function adjustStock({
	itemId,
	userId,
	type,
	delta,
	note,
}: {
	itemId: string;
	userId: string;
	type: "RESTOCK" | "SALE" | "WASTE" | "AUDIT";
	delta: number;
	note?: string;
}) {
	return await db.transaction(async (tx) => {
		const [current] = await tx
			.update(items)
			.set({ current_stock: sql`${items.current_stock} + ${delta}` })
			.where(eq(items.id, itemId))
			.returning();

		if (!current) throw new Error("Item not found");

		const newStock = Number(current.current_stock);
		const prevStock = newStock - delta;

		await tx.insert(inventoryEvents).values({
			item_id: itemId,
			user_id: userId,
			type: type,
			quantity: String(delta),
			prev_stock: String(prevStock),
			new_stock: String(newStock),
			note: note,
		});
		return { itemId, prevStock, newStock };
	});
}
