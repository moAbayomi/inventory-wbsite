import request from "supertest";
import app from "../../src/server.ts";
import { cleanupDb, createTestUser, createTestCategory, createTestItem } from "../setup/dbHelpers.ts";

describe("Category endpoints", () => {
  let authToken: string;

  beforeAll(async () => {
    const { token } = await createTestUser({ role: "ADMIN" as const });
    authToken = token;
  });

  afterEach(async () => {
    await cleanupDb();
  });

  describe("POST /api/v1/categories", () => {
    it("should create a category", async () => {
      const response = await request(app)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Ankara", description: "African wax print" })
        .expect(201);

      expect(response.body.category.name).toBe("Ankara");
      expect(response.body.category.is_active).toBe(true);
    });
  });

  describe("GET /api/v1/categories", () => {
    it("should list only active categories by default", async () => {
      const active = await createTestCategory({ name: `Active-${Date.now()}` });
      const inactive = await createTestCategory({ name: `Inactive-${Date.now()}`, is_active: false });

      const response = await request(app)
        .get("/api/v1/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const ids = response.body.categories.map((c: any) => c.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(inactive.id);
    });

    it("should include inactive categories when asked", async () => {
      const inactive = await createTestCategory({ name: `Inactive-${Date.now()}`, is_active: false });

      const response = await request(app)
        .get("/api/v1/categories?includeInactive=true")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const ids = response.body.categories.map((c: any) => c.id);
      expect(ids).toContain(inactive.id);
    });
  });

  describe("An item can be assigned to a category", () => {
    it("should attach category_id at creation and return it on the item", async () => {
      const category = await createTestCategory({ name: `Lace-${Date.now()}` });

      const response = await request(app)
        .post("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Lace",
          sku: `SKU-${Date.now()}`,
          category_id: category.id,
          current_stock: 10,
          cost_price: 100,
          selling_price: 200,
        })
        .expect(201);

      expect(response.body.item.category_id).toBe(category.id);
    });
  });

  describe("DELETE /api/v1/categories/:id", () => {
    it("should soft-delete: hide it from the default list without breaking items that reference it", async () => {
      const category = await createTestCategory({ name: `ToDelete-${Date.now()}` });
      const item = await createTestItem({ category_id: category.id } as any);

      await request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const listRes = await request(app)
        .get("/api/v1/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(listRes.body.categories.map((c: any) => c.id)).not.toContain(category.id);

      // the item's category_id is untouched -- this was a soft delete, so
      // the foreign key row still exists.
      const itemRes = await request(app)
        .get(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      expect(itemRes.body.item.category_id).toBe(category.id);
    });
  });
});
