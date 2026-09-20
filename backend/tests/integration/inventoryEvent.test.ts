import request from "supertest"
import app from "../../src/server.ts"
import { cleanupDb, createTestUser, createTestItem } from "../setup/dbHelpers.ts"

describe("Inventory Events endpoint", () => {
  let authToken: string;
  beforeAll(async () => {
    const { token } = await createTestUser({ role: "ADMIN" as const })
    authToken = token;
  })
  afterEach(async () => {
    await cleanupDb()
  })

  describe("GET /api/v1/events/items/:id", () => {
    it("should show all of the events for a particular item", async () => {
      const item = await createTestItem()

      // Stock only moves (and gets logged) through /adjust, /audit, or a
      // sale now -- a generic PATCH can no longer trigger an event.
      await request(app)
        .post(`/api/v1/items/${item.id}/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 1, type: "RESTOCK" })
        .expect(200)

      const response = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("events")
      expect(response.body.count).toEqual(1)
    })
  })

   describe("GET /api/v1/events/:id", () => {
    it("should show the details of a singular event", async () => {
      const item = await createTestItem()

      await request(app)
        .post(`/api/v1/items/${item.id}/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 1, type: "RESTOCK" })
        .expect(200)

      const eventsRes = await request(app)
        .get(`/api/v1/events/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const event = eventsRes.body.events[0];

      const response = await request(app)
        .get(`/api/v1/events/${event.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("event")
    })
  })
})
