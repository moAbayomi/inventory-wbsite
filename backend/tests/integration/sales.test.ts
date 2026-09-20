import request from "supertest";
import app from "../../src/server.ts";
import { cleanupDb, createTestUser, createTestItem } from "../setup/dbHelpers.ts";

describe("Sales endpoints", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const { token, user } = await createTestUser({ role: "ADMIN" as const });
    authToken = token;
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupDb();
  });

  describe("POST /api/v1/sales", () => {
    it("should record a sale, decrement stock, log a SALE event, and record a payment", async () => {
      const item = await createTestItem({
        current_stock: "10.00",
        cost_price: "500.00",
        selling_price: "800.00",
      } as any);

      const response = await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          items: [{ item_id: item.id, quantity: 3 }],
          customer_name: "Test Customer",
          payment: { method: "CASH" },
        })
        .expect(201);

      expect(response.body.sale.total_amount).toBe("2400.00"); // 800 * 3
      expect(response.body.sale.total_profit).toBe("900.00"); // (800-500) * 3

      const itemRes = await request(app)
        .get(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(itemRes.body.item.current_stock).toBe("7.00");

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(eventsRes.body.events[0].type).toBe("SALE");
      expect(eventsRes.body.events[0].quantity).toBe("-3.00");

      const detailRes = await request(app)
        .get(`/api/v1/sales/${response.body.sale.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(detailRes.body.payments).toHaveLength(1);
      expect(detailRes.body.payments[0].method).toBe("CASH");
      expect(detailRes.body.payments[0].status).toBe("CONFIRMED");
    });

    it("should sell across multiple items in one sale", async () => {
      const itemA = await createTestItem({ current_stock: "10.00", selling_price: "100.00", cost_price: "50.00" } as any);
      const itemB = await createTestItem({ current_stock: "10.00", selling_price: "200.00", cost_price: "120.00" } as any);

      const response = await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          items: [
            { item_id: itemA.id, quantity: 2 },
            { item_id: itemB.id, quantity: 1 },
          ],
          payment: { method: "TRANSFER", reference: "TRX-1" },
        })
        .expect(201);

      // (100*2) + (200*1) = 400
      expect(response.body.sale.total_amount).toBe("400.00");
    });

    it("should reject a sale that asks for more than is in stock", async () => {
      const item = await createTestItem({ current_stock: "2.00" } as any);

      await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          items: [{ item_id: item.id, quantity: 5 }],
          payment: { method: "CASH" },
        })
        .expect(400);

      const itemRes = await request(app)
        .get(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      // stock must be untouched -- the whole sale is one transaction
      expect(itemRes.body.item.current_stock).toBe("2.00");
    });

    it("should only let one of two simultaneous sales for the last unit succeed", async () => {
      const item = await createTestItem({ current_stock: "1.00" } as any);

      const sell = () =>
        request(app)
          .post("/api/v1/sales")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ items: [{ item_id: item.id, quantity: 1 }], payment: { method: "CASH" } });

      const [first, second] = await Promise.all([sell(), sell()]);
      const statuses = [first.status, second.status].sort();

      expect(statuses).toEqual([201, 400]);

      const itemRes = await request(app)
        .get(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(itemRes.body.item.current_stock).toBe("0.00");
    });
  });

  describe("GET /api/v1/sales", () => {
    it("should default page and limit when no query params are sent", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any);
      await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ items: [{ item_id: item.id, quantity: 1 }], payment: { method: "CASH" } })
        .expect(201);

      // No ?page=&limit= at all -- this is exactly the case that used to
      // 500 once listSalesQuerySchema's defaults stopped reaching the
      // controller (validateQuery discarded the parsed/defaulted result).
      const response = await request(app)
        .get("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/v1/sales/:id", () => {
    it("should return only this sale's line items, with the item name correctly joined", async () => {
      const itemA = await createTestItem({ current_stock: "10.00", name: "Item A" } as any);
      const itemB = await createTestItem({ current_stock: "10.00", name: "Item B" } as any);

      // A second, unrelated sale that must NOT show up in the first sale's detail.
      await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ items: [{ item_id: itemB.id, quantity: 1 }], payment: { method: "CASH" } })
        .expect(201);

      const saleRes = await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ items: [{ item_id: itemA.id, quantity: 2 }], payment: { method: "CASH" } })
        .expect(201);

      const detailRes = await request(app)
        .get(`/api/v1/sales/${saleRes.body.sale.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(detailRes.body.items).toHaveLength(1);
      expect(detailRes.body.items[0].item_name).toBe("Item A");
      expect(detailRes.body.items[0].quantity).toBe("2.00");
    });
  });

  describe("GET /api/v1/sales/summary", () => {
    it("should total revenue and profit across sales in range", async () => {
      const item = await createTestItem({
        current_stock: "10.00",
        selling_price: "1000.00",
        cost_price: "600.00",
      } as any);

      await request(app)
        .post("/api/v1/sales")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ items: [{ item_id: item.id, quantity: 2 }], payment: { method: "CASH" } })
        .expect(201);

      const response = await request(app)
        .get("/api/v1/sales/summary?range=today")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.totals.revenue).toBe("2000.00");
      expect(response.body.totals.profit).toBe("800.00");
      expect(response.body.totals.sale_count).toBe(1);
      expect(response.body.by_payment_method.some((m: any) => m.method === "CASH")).toBe(true);
    });
  });
});
