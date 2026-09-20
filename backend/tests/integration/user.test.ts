import request from "supertest";
import { cleanupDb, createTestUser } from "../setup/dbHelpers.ts";
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
    })
  })
})
