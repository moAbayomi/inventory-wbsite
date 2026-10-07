import request from "supertest";
import { cleanupDb, createTestUser, createTestItem, createTestSale } from "../setup/dbHelpers.ts";
import app from "../../src/server.ts";


describe("User endpoints", () => {

  let authToken: string

  beforeAll(async () => {
    const { token } = await createTestUser({role: "ADMIN"});
    authToken = token;
  })

  afterEach(async () => {
    await cleanupDb();
  })

  describe("GET /api/v1/users/", () => {
    it("should list all the users in the db", async () => {

      const USERS_NO = 5;
      for (let i = 0; i < USERS_NO; i++) {
        await createTestUser()
      }

      const response = await request(app)
        .get("/api/v1/users/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(response.body).toHaveProperty("users")
    })
  })

  describe("GET /api/v1/users/:id", () => {
    it("should get a user using the user's id", async () => {
      const { token, user } = await createTestUser();

      const response = await request(app)
        .get(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("user")
    })
  })


  describe("PATCH /api/v1/users/:id", () => {
    it("should update certain properties in a user successfully", async () => {
      const {user} = await createTestUser()
      const updatedUsersCredentials = {
        name: "Updated Name",
        role: "ADMIN" as const
      }

      const response = await request(app)
        .patch(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedUsersCredentials)
        .expect(200)

      expect(response.body).toHaveProperty("user")
      expect(response.body.message).toBe("user updated successfully")
      expect(response.body.user.name).toBe(updatedUsersCredentials.name)
      expect(response.body.user.role).toBe(updatedUsersCredentials.role)      
    })
  })

  describe("DELETE /api/v1/users/:id", () => {
    it("should successfully delete a user from the db", async () => {
      const { user } = await createTestUser();

      const response = await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.message).toBe("User deleted successfully")
      expect(response.body).toHaveProperty("userId")
      // No sales/activity, so nothing needs the row: it's gone entirely.
      expect(response.body.result).toBe("deleted")
      await request(app)
        .get(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404)
    })

    it("should keep a user with history on past records but remove the account", async () => {
      const { user, password } = await createTestUser({ name: "Chidi Seller" });
      const item = await createTestItem({ current_stock: "5.00" } as any);
      const sale = await createTestSale({ user_id: user.id, item });

      const response = await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(response.body.result).toBe("archived")

      // Gone from the users list...
      const list = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(list.body.users.map((u: { id: string }) => u.id)).not.toContain(user.id)

      // ...can't sign in any more...
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password })
        .expect(401)

      // ...but their past sale still shows who made it.
      const detail = await request(app)
        .get(`/api/v1/sales/${sale.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
      expect(detail.body.sale.sold_by_name).toBe("Chidi Seller")
    })

    it("should free a deleted user's email so they can be invited again", async () => {
      const { user } = await createTestUser();
      const item = await createTestItem({ current_stock: "5.00" } as any);
      await createTestSale({ user_id: user.id, item });

      await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Inviting fails only on sending the email in tests (no real mail
      // service) -- what matters is that it's no longer a 409 "already
      // exists".
      const invite = await request(app)
        .post("/api/v1/invites")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: user.email, role: "STAFF" })
      expect(invite.status).not.toBe(409)
    })

    it("should refuse to delete your own account", async () => {
      const { user, token } = await createTestUser({ role: "ADMIN" });

      await request(app)
        .delete(`/api/v1/users/${user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })
  })
})
