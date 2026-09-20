import request from "supertest";
import app from "../../src/server.ts";
import { cleanupDb, createTestUser, createTestItem } from "../setup/dbHelpers.ts";

describe("Inventory aggregate endpoints", () => {
  let authToken: string;

  beforeAll(async () => {
    const { token } = await createTestUser({ role: "ADMIN" as const });
    authToken = token;
  });

  afterEach(async () => {
    await cleanupDb();
  });

  describe("GET /api/v1/inventory/current", () => {
    it("should return aggregated stock value across the catalogue", async () => {
      await createTestItem({ current_stock: "10.00", cost_price: "100.00", selling_price: "150.00" } as any);
      await createTestItem({ current_stock: "5.00", cost_price: "200.00", selling_price: "300.00" } as any);

      const response = await request(app)
        .get("/api/v1/inventory/current")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // stock value: 10*100 + 5*200 = 2000; retail value: 10*150 + 5*300 = 3000
      expect(response.body.totals.item_count).toBe(2);
      expect(response.body.totals.total_stock_value).toBe("2000.00");
      expect(response.body.totals.total_retail_value).toBe("3000.00");
    });
  });

  describe("GET /api/v1/inventory/low-stock", () => {
    it("should only return items at or below their own low_stock_threshold", async () => {
      await createTestItem({ current_stock: "2.00", low_stock_threshold: "5.00" } as any);
      await createTestItem({ current_stock: "50.00", low_stock_threshold: "5.00" } as any);

      const response = await request(app)
        .get("/api/v1/inventory/low-stock")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.items[0].current_stock).toBe("2.00");
    });
  });
});
