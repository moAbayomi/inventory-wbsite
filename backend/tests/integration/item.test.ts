import request from "supertest";
import app from "../../src/server.ts";
import { cleanupDb, createTestItem, createTestUser } from "../setup/dbHelpers.ts";


describe("Item endpoints", () => {

  let authToken: string;

  beforeAll(async () => {
    const { token } = await createTestUser()
    authToken = token
  })

  afterEach( async () => {
    await cleanupDb()
  })

  describe("GET /api/v1/items", () => {
    it("should show that the items are listed", async () => {
      const ITEMS_NO = 5
      for (let i = 0; i < ITEMS_NO; i++) {
        await createTestItem()
      }

      const response = await request(app)
        .get("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.count).toBe(ITEMS_NO)
      expect(response.body.items).toHaveLength(ITEMS_NO)
    })

    it("should return 200 with an empty list rather than a 404 when there are no items", async () => {
      const response = await request(app)
        .get("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.count).toBe(0)
      expect(response.body.items).toEqual([])
    })
  })

  describe("POST /api/v1/items/", () => {
    it("should create a fabric item with the fabric-specific fields", async () => {
      const item = {
        name: "Test Ankara Print",
        item_type: "FABRIC" as const,
        sku: `SKU-${Date.now()}`,
        unit: "yard",
        design: "Test Design",
        color: "Green",
        dye_lot: "DL-TEST-01",
        width_inches: 46,
        description: "a fabric item for testing",
        current_stock: 10,
        low_stock_threshold: 4,
        cost_price: 1000,
        selling_price: 1500,
      }

      const response = await request(app)
        .post("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(item)
        .expect(201);

      expect(response.body.message).toBe("Item created successfully")
      expect(response.body.item.name).toBe(item.name)
      expect(response.body.item.item_type).toBe("FABRIC")
      expect(response.body.item.color).toBe("Green")
      expect(response.body.item.width_inches).toBe(46)
      // numeric columns come back as strings ("1500.00"), not the JS
      // number that was sent in -- decimal.js/Postgres numeric precision
      // is the whole point of storing them this way.
      expect(response.body.item.selling_price).toBe("1500.00")
      expect(response.body.item.current_stock).toBe("10.00")
    })

    it("should create a ready-made item with a size and style_code", async () => {
      const item = {
        name: "Test Ankara Shirt (M)",
        item_type: "READY_MADE" as const,
        sku: `SKU-SHIRT-${Date.now()}`,
        unit: "piece",
        size: "M",
        style_code: "SHIRT-TEST",
        color: "Green",
        current_stock: 5,
        cost_price: 4000,
        selling_price: 7000,
        description: "a ready-made item for testing",
      }

      const response = await request(app)
        .post("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(item)
        .expect(201);

      expect(response.body.item.item_type).toBe("READY_MADE")
      expect(response.body.item.size).toBe("M")
      expect(response.body.item.style_code).toBe("SHIRT-TEST")
    })

    it("should reject an item with no price", async () => {
      const item = {
        name: "No price item",
        sku: `SKU-${Date.now()}`,
      }

      await request(app)
        .post("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(item)
        .expect(400);
    })

    it("should log a CREATE inventory event when created with initial stock", async () => {
      const item = {
        name: "Item with initial stock",
        sku: `SKU-${Date.now()}`,
        current_stock: 20,
        cost_price: 100,
        selling_price: 200,
      }

      const createRes = await request(app)
        .post("/api/v1/items/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(item)
        .expect(201)

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${createRes.body.item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(eventsRes.body.count).toBe(1)
      expect(eventsRes.body.events[0].type).toBe("CREATE")
    })
  })

  describe("GET /api/v1/items/:id", () => {
    it("should show the details of the particular item, including fabric fields", async () => {
      const item = await createTestItem({ color: "Blue", design: "Test Design" } as any)

      const response = await request(app).
        get(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("item")
      expect(response.body.item.color).toBe("Blue")
      expect(response.body.item.design).toBe("Test Design")
    })
  })

  describe("GET /api/v1/items/sku/:sku", () => {
    it("should look up an item by its SKU (barcode-style lookup)", async () => {
      const item = await createTestItem()

      const response = await request(app)
        .get(`/api/v1/items/sku/${item.sku}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.item.id).toBe(item.id)
    })

    it("should 404 for a SKU that doesn't exist", async () => {
      await request(app)
        .get(`/api/v1/items/sku/does-not-exist-sku`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe("PATCH /api/v1/items/:id", () => {
    it("should update editable details of the item", async () => {
      const item = await createTestItem()

      const updatedCredentials = {
        name: "Updated Item Name",
        color: "Updated Color",
      }
      const response = await request(app)
        .patch(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedCredentials)
        .expect(200)

      expect(response.body.item.name).toBe(updatedCredentials.name)
      expect(response.body.item.color).toBe(updatedCredentials.color)
    })

    it("should NOT change current_stock via a generic update, and should not log an event for it", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any)

      const response = await request(app)
        .patch(`/api/v1/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Renamed", current_stock: 999 })
        .expect(200)

      // current_stock is not part of updateItemSchema, so zod strips it --
      // the field is simply ignored, not applied.
      expect(response.body.item.current_stock).toBe("10.00")
      expect(response.body.item.name).toBe("Renamed")

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(eventsRes.body.count).toBe(0)
    })
  })

  describe("POST /api/v1/items/:id/adjust", () => {
    it("should restock an item and log a RESTOCK event", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any)

      const response = await request(app)
        .post(`/api/v1/items/${item.id}/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 5, type: "RESTOCK", note: "delivery arrived" })
        .expect(200)

      expect(response.body.item.current_stock).toBe("15.00")

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(eventsRes.body.count).toBe(1)
      expect(eventsRes.body.events[0].type).toBe("RESTOCK")
      expect(eventsRes.body.events[0].quantity).toBe("5.00")
    })

    it("should record waste as a negative movement even though the input quantity is positive", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any)

      const response = await request(app)
        .post(`/api/v1/items/${item.id}/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 3, type: "WASTE", note: "damaged" })
        .expect(200)

      expect(response.body.item.current_stock).toBe("7.00")

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(eventsRes.body.events[0].quantity).toBe("-3.00")
    })

    it("should refuse to take stock negative", async () => {
      const item = await createTestItem({ current_stock: "2.00" } as any)

      await request(app)
        .post(`/api/v1/items/${item.id}/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 5, type: "WASTE" })
        .expect(400)
    })
  })

  describe("POST /api/v1/items/:id/audit", () => {
    it("should reconcile a physical count and log the delta as an AUDIT event", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any)

      const response = await request(app)
        .post(`/api/v1/items/${item.id}/audit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ counted_stock: 8, note: "physical count" })
        .expect(200)

      expect(response.body.item.current_stock).toBe("8.00")

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(eventsRes.body.events[0].type).toBe("AUDIT")
      expect(eventsRes.body.events[0].quantity).toBe("-2.00")
    })

    it("should not write an event when the count matches", async () => {
      const item = await createTestItem({ current_stock: "10.00" } as any)

      await request(app)
        .post(`/api/v1/items/${item.id}/audit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ counted_stock: 10 })
        .expect(200)

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(eventsRes.body.count).toBe(0)
    })
  })

  describe("DELETE /api/v1/items/:id", () => {
    it("should show that a deleted item is no more in the db", async () => {
      const newTestItem = await createTestItem();

      const response = await request(app).
        delete(`/api/v1/items/${newTestItem.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty("message")
      expect(response.body.message).toBe("item successfully deleted")
    })
  })
})
