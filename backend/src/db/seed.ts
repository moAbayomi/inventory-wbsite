import { db } from "./db.ts";
import {
  users,
  categories,
  items,
  inventoryEvents,
  sales,
  salesItems,
  payments,
  type Item,
} from "./schema.ts";
import { eq } from "drizzle-orm";
import { hashPassword } from "../utils/utils.ts";

// Realistic data for a fabric & ready-to-wear shop: fabric sold by the yard
// off a roll (design/color/dye lot/width matter), and ready-made garments
// sold as a whole piece in a size (style_code groups sizes of "the same
// garment" together, e.g. SHIRT-ANK-RBF-M/L/XL). Every stock number below
// is deliberately consistent with the CREATE/SALE/WASTE events inserted
// alongside it, exactly like the real API would leave the data.
async function seedShop() {
  console.log("🧵 Seeding Abby's Robe fabric & ready-to-wear dataset...");

  const ownerPassword = "admin1234";
  const staffPassword = "staff1234";

  const [owner] = await db
    .insert(users)
    .values({
      name: "Amaka Okafor",
      email: "owner@sweevo.ng",
      password_hash: await hashPassword(ownerPassword),
      role: "ADMIN",
    })
    .returning();

  const [staff] = await db
    .insert(users)
    .values({
      name: "Chidi Umeh",
      email: "chidi@sweevo.ng",
      password_hash: await hashPassword(staffPassword),
      role: "STAFF",
    })
    .returning();

  if (!owner || !staff) throw new Error("failed to seed users");
  console.log(`👤 Seeded users: ${owner.name} (ADMIN), ${staff.name} (STAFF)`);
  console.log(`   login: owner@sweevo.ng / ${ownerPassword}`);
  console.log(`   login: chidi@sweevo.ng / ${staffPassword}`);

  const categoryRows = await db
    .insert(categories)
    .values([
      { name: "Ankara & African Print" },
      { name: "Lace" },
      { name: "Cotton & Linen" },
      { name: "Aso-Oke" },
      { name: "Ready-to-Wear" },
    ])
    .returning();

  const categoryByName = new Map(categoryRows.map((c) => [c.name, c]));
  const ankaraCat = categoryByName.get("Ankara & African Print")!;
  const laceCat = categoryByName.get("Lace")!;
  const cottonCat = categoryByName.get("Cotton & Linen")!;
  const asoOkeCat = categoryByName.get("Aso-Oke")!;
  const readyCat = categoryByName.get("Ready-to-Wear")!;

  console.log(`🏷️  Seeded ${categoryRows.length} categories.`);

  type FabricSeed = {
    name: string;
    design?: string;
    color: string;
    dye_lot?: string;
    width_inches: number;
    sku: string;
    category_id: string;
    cost_price: string;
    selling_price: string;
    initialStock: string;
    low_stock_threshold: string;
    description: string;
  };

  const fabrics: FabricSeed[] = [
    {
      name: "Ankara Print — Royal Blue Floral",
      design: "Floral Riot",
      color: "Royal Blue",
      dye_lot: "DL-2026-014",
      width_inches: 46,
      sku: "ANK-RBF-46",
      category_id: ankaraCat.id,
      cost_price: "2200.00",
      selling_price: "3200.00",
      initialStock: "90.00",
      low_stock_threshold: "15.00",
      description: "100% cotton Ankara wax print, sold off the roll.",
    },
    {
      name: "Ankara Print — Sunburst Orange",
      design: "Sunburst",
      color: "Orange",
      dye_lot: "DL-2026-021",
      width_inches: 46,
      sku: "ANK-SBO-46",
      category_id: ankaraCat.id,
      cost_price: "2200.00",
      selling_price: "3200.00",
      initialStock: "40.00",
      low_stock_threshold: "15.00",
      description: "100% cotton Ankara wax print, sold off the roll.",
    },
    {
      name: "Swiss Voile Lace — Ivory",
      design: "Swiss Voile",
      color: "Ivory",
      dye_lot: "DL-2026-005",
      width_inches: 60,
      sku: "LACE-IV-60",
      category_id: laceCat.id,
      cost_price: "4500.00",
      selling_price: "6500.00",
      initialStock: "22.00",
      low_stock_threshold: "10.00",
      description: "Lightweight Swiss voile lace for occasion wear.",
    },
    {
      name: "French Lace — Wine",
      design: "Corded French Lace",
      color: "Wine",
      dye_lot: "DL-2026-009",
      width_inches: 60,
      sku: "LACE-WN-60",
      category_id: laceCat.id,
      cost_price: "5200.00",
      selling_price: "7800.00",
      initialStock: "10.00",
      low_stock_threshold: "10.00",
      description: "Corded French lace, heavier weight.",
    },
    {
      name: "Cotton Chambray — Sky Blue",
      color: "Sky Blue",
      width_inches: 58,
      sku: "COT-SKY-58",
      category_id: cottonCat.id,
      cost_price: "1200.00",
      selling_price: "1900.00",
      initialStock: "63.00",
      low_stock_threshold: "15.00",
      description: "Soft cotton chambray, good for shirting.",
    },
    {
      name: "Linen Blend — Sand",
      color: "Sand",
      width_inches: 58,
      sku: "LIN-SND-58",
      category_id: cottonCat.id,
      cost_price: "1600.00",
      selling_price: "2400.00",
      initialStock: "4.00",
      low_stock_threshold: "8.00",
      description: "Cotton-linen blend, breathable weight.",
    },
    {
      name: "Aso-Oke — Ceremonial Gold",
      design: "Ceremonial Strip Weave",
      color: "Gold",
      dye_lot: "DL-2026-030",
      width_inches: 40,
      sku: "ASO-GLD-40",
      category_id: asoOkeCat.id,
      cost_price: "8000.00",
      selling_price: "12000.00",
      initialStock: "10.00",
      low_stock_threshold: "6.00",
      description: "Handwoven ceremonial Aso-Oke strip fabric.",
    },
  ];

  const insertedFabrics = await db
    .insert(items)
    .values(
      fabrics.map((f) => ({
        name: f.name,
        item_type: "FABRIC" as const,
        design: f.design ?? null,
        color: f.color,
        dye_lot: f.dye_lot ?? null,
        width_inches: f.width_inches,
        sku: f.sku,
        category_id: f.category_id,
        unit: "yard",
        cost_price: f.cost_price,
        selling_price: f.selling_price,
        current_stock: f.initialStock,
        low_stock_threshold: f.low_stock_threshold,
        description: f.description,
      })),
    )
    .returning();

  const fabricByName = new Map(insertedFabrics.map((i) => [i.name, i]));
  console.log(`🧶 Seeded ${insertedFabrics.length} fabric items.`);

  type ReadyMadeSeed = {
    name: string;
    style_code: string;
    size: string;
    color: string;
    sku: string;
    cost_price: string;
    selling_price: string;
    initialStock: string;
    low_stock_threshold: string;
    description: string;
  };

  const readyMade: ReadyMadeSeed[] = [
    {
      name: "Ankara Shirt — Royal Blue (M)",
      style_code: "SHIRT-ANK-RBF",
      size: "M",
      color: "Royal Blue",
      sku: "SHIRT-ANK-RBF-M",
      cost_price: "4500.00",
      selling_price: "7500.00",
      initialStock: "6.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear men's shirt, Royal Blue Floral Ankara.",
    },
    {
      name: "Ankara Shirt — Royal Blue (L)",
      style_code: "SHIRT-ANK-RBF",
      size: "L",
      color: "Royal Blue",
      sku: "SHIRT-ANK-RBF-L",
      cost_price: "4500.00",
      selling_price: "7500.00",
      initialStock: "9.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear men's shirt, Royal Blue Floral Ankara.",
    },
    {
      name: "Ankara Shirt — Royal Blue (XL)",
      style_code: "SHIRT-ANK-RBF",
      size: "XL",
      color: "Royal Blue",
      sku: "SHIRT-ANK-RBF-XL",
      cost_price: "4500.00",
      selling_price: "7500.00",
      initialStock: "3.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear men's shirt, Royal Blue Floral Ankara.",
    },
    {
      name: "Lace Blouse — Ivory (S)",
      style_code: "BLOUSE-LACE-IV",
      size: "S",
      color: "Ivory",
      sku: "BLOUSE-LACE-IV-S",
      cost_price: "6000.00",
      selling_price: "9500.00",
      initialStock: "4.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear women's blouse, Swiss voile lace.",
    },
    {
      name: "Lace Blouse — Ivory (M)",
      style_code: "BLOUSE-LACE-IV",
      size: "M",
      color: "Ivory",
      sku: "BLOUSE-LACE-IV-M",
      cost_price: "6000.00",
      selling_price: "9500.00",
      initialStock: "6.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear women's blouse, Swiss voile lace.",
    },
    {
      name: "Lace Blouse — Ivory (L)",
      style_code: "BLOUSE-LACE-IV",
      size: "L",
      color: "Ivory",
      sku: "BLOUSE-LACE-IV-L",
      cost_price: "6000.00",
      selling_price: "9500.00",
      initialStock: "2.00",
      low_stock_threshold: "5.00",
      description: "Ready-to-wear women's blouse, Swiss voile lace.",
    },
    {
      name: "Men's Kaftan — Wine Aso-Oke (L)",
      style_code: "KAFTAN-ASO-WN",
      size: "L",
      color: "Wine",
      sku: "KAFTAN-ASO-WN-L",
      cost_price: "15000.00",
      selling_price: "22000.00",
      initialStock: "3.00",
      low_stock_threshold: "3.00",
      description: "Ready-to-wear ceremonial kaftan, Aso-Oke.",
    },
    {
      name: "Men's Kaftan — Wine Aso-Oke (XL)",
      style_code: "KAFTAN-ASO-WN",
      size: "XL",
      color: "Wine",
      sku: "KAFTAN-ASO-WN-XL",
      cost_price: "15000.00",
      selling_price: "22000.00",
      initialStock: "2.00",
      low_stock_threshold: "3.00",
      description: "Ready-to-wear ceremonial kaftan, Aso-Oke.",
    },
  ];

  const insertedReadyMade = await db
    .insert(items)
    .values(
      readyMade.map((r) => ({
        name: r.name,
        item_type: "READY_MADE" as const,
        style_code: r.style_code,
        size: r.size,
        color: r.color,
        sku: r.sku,
        category_id: readyCat.id,
        unit: "piece",
        cost_price: r.cost_price,
        selling_price: r.selling_price,
        current_stock: r.initialStock,
        low_stock_threshold: r.low_stock_threshold,
        description: r.description,
      })),
    )
    .returning();

  const readyByName = new Map(insertedReadyMade.map((i) => [i.name, i]));
  console.log(`👕 Seeded ${insertedReadyMade.length} ready-made items.`);

  // CREATE events for every item, matching its initial stock.
  const allItems = [...insertedFabrics, ...insertedReadyMade];
  await db.insert(inventoryEvents).values(
    allItems.map((item) => ({
      item_id: item.id,
      user_id: owner.id,
      type: "CREATE" as const,
      quantity: item.current_stock,
      prev_stock: "0.00",
      new_stock: item.current_stock,
      note: `Initial stock of ${item.current_stock} ${item.unit}`,
    })),
  );
  console.log("📊 Seeded CREATE inventory events for every item.");

  // A WASTE event on the French Lace -- damaged in transit. Drops its stock
  // from the 10.00 yards it was created with down to 8.00, below its own
  // 10.00 threshold: a deliberate low-stock example for the dashboard.
  const frenchLace = fabricByName.get("French Lace — Wine")!;
  await db.insert(inventoryEvents).values({
    item_id: frenchLace.id,
    user_id: staff.id,
    type: "WASTE",
    quantity: "-2.00",
    prev_stock: "10.00",
    new_stock: "8.00",
    note: "2 yards damaged in transit from supplier.",
  });
  await db
    .update(items)
    .set({ current_stock: "8.00" })
    .where(eq(items.id, frenchLace.id));
  console.log("📉 Seeded a WASTE event (French Lace — Wine, now low stock).");

  // A few real sales -- each with line items, a SALE inventory event, a
  // stock decrement, and a payment, exactly like a real checkout produces.
  // This gives the frontend actual sales history to render from day one.
  async function recordSeedSale(opts: {
    user_id: string;
    customer_name?: string;
    customer_phone?: string;
    payment_method: "CASH" | "TRANSFER" | "POS";
    payment_reference?: string;
    note?: string;
    lines: { item: Item; quantity: string }[];
  }) {
    let total = 0;
    let profit = 0;

    const [sale] = await db
      .insert(sales)
      .values({
        user_id: opts.user_id,
        total_amount: "0.00",
        total_profit: "0.00",
        customer_name: opts.customer_name ?? null,
        customer_phone: opts.customer_phone ?? null,
        payment_method: opts.payment_method,
        payment_status: "PAID",
        note: opts.note ?? null,
      })
      .returning();
    if (!sale) throw new Error("failed to seed sale");

    for (const line of opts.lines) {
      const qty = Number(line.quantity);
      const sellingPrice = Number(line.item.selling_price);
      const costPrice = Number(line.item.cost_price);
      const subtotal = (sellingPrice * qty).toFixed(2);
      const lineProfit = ((sellingPrice - costPrice) * qty).toFixed(2);
      total += Number(subtotal);
      profit += Number(lineProfit);

      await db.insert(salesItems).values({
        sale_id: sale.id,
        item_id: line.item.id,
        quantity: line.quantity,
        price_per_unit: line.item.selling_price,
        cost_per_unit: line.item.cost_price,
        subtotal,
        profit: lineProfit,
      });

      const prevStock = Number(line.item.current_stock);
      const newStock = (prevStock - qty).toFixed(2);

      await db.insert(inventoryEvents).values({
        item_id: line.item.id,
        user_id: opts.user_id,
        type: "SALE",
        quantity: (-qty).toFixed(2),
        prev_stock: line.item.current_stock,
        new_stock: newStock,
        note: `Sold to ${opts.customer_name ?? "walk-in"}`,
      });

      await db
        .update(items)
        .set({ current_stock: newStock })
        .where(eq(items.id, line.item.id));
    }

    await db
      .update(sales)
      .set({
        total_amount: total.toFixed(2),
        total_profit: profit.toFixed(2),
      })
      .where(eq(sales.id, sale.id));

    await db.insert(payments).values({
      sale_id: sale.id,
      amount: total.toFixed(2),
      method: opts.payment_method,
      status: "CONFIRMED",
      received_by: opts.user_id,
      reference: opts.payment_reference ?? null,
    });

    return sale;
  }

  const ankaraRBF = fabricByName.get("Ankara Print — Royal Blue Floral")!;
  const shirtRBFL = readyByName.get("Ankara Shirt — Royal Blue (L)")!;
  const chambray = fabricByName.get("Cotton Chambray — Sky Blue")!;
  const blouseIvoryM = readyByName.get("Lace Blouse — Ivory (M)")!;

  await recordSeedSale({
    user_id: staff.id,
    customer_name: "Ngozi (walk-in)",
    payment_method: "CASH",
    note: "5 yards Ankara + a ready-made shirt.",
    lines: [
      { item: ankaraRBF, quantity: "5.00" },
      { item: shirtRBFL, quantity: "1.00" },
    ],
  });

  await recordSeedSale({
    user_id: owner.id,
    customer_name: "Tailor Musa",
    customer_phone: "08031234567",
    payment_method: "TRANSFER",
    payment_reference: "TRX-778215",
    note: "Regular customer, restocking for the week.",
    lines: [{ item: chambray, quantity: "3.00" }],
  });

  await recordSeedSale({
    user_id: staff.id,
    payment_method: "POS",
    lines: [{ item: blouseIvoryM, quantity: "1.00" }],
  });

  console.log("🧾 Seeded 3 sample sales, their payments, and SALE events.");
  console.log("✨ Abby's Robe database fully operational!");
  process.exit(0);
}

seedShop().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

export default seedShop;
