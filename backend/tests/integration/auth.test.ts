import request from "supertest";
import app from "../../src/server.ts";
import { createTestUser, cleanupDb } from "../setup/dbHelpers.ts";


describe("Authentication endpoints", () => {
  afterEach(async () => {
    await cleanupDb()
  })
  describe("POST /api/v1/auth/login", () => {
    it("should login a user with valid data", async () => {

      const testUser = await createTestUser()
      const credentials = {
        email: testUser.user.email,
        password: testUser.password
      }

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(credentials)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty("accessToken")
      expect(response.body).toHaveProperty("user")
      expect(response.body.user.email).toBe(credentials.email)
    })

    it("should reject an invalid password", async () => {
      const testUser = await createTestUser()

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: testUser.user.email, password: "wrong-password-here" })

      expect(response.status).toBe(400)
    })
  })

  describe("POST /api/v1/auth/refresh", () => {
    it("should issue a new, real access token string from the refresh cookie", async () => {
      const testUser = await createTestUser()

      const agent = request.agent(app)
      await agent
        .post("/api/v1/auth/login")
        .send({ email: testUser.user.email, password: testUser.password })
        .expect(200)

      const response = await agent.post("/api/v1/auth/refresh").expect(200)

      expect(response.body).toHaveProperty("accessToken")
      // generateAccessToken() is async -- a previous version of refresh()
      // forgot to await it, so accessToken came back as "{}" (a
      // JSON-serialized pending Promise) instead of a JWT string.
      expect(typeof response.body.accessToken).toBe("string")
      expect(response.body.accessToken.split(".").length).toBe(3)
    })
  })

  describe("POST /api/v1/auth/logout", () => {
    it("should revoke the refresh token so it can no longer be used to refresh", async () => {
      const testUser = await createTestUser()

      const agent = request.agent(app)
      await agent
        .post("/api/v1/auth/login")
        .send({ email: testUser.user.email, password: testUser.password })
        .expect(200)

      await agent.post("/api/v1/auth/logout").expect(200)

      const response = await agent.post("/api/v1/auth/refresh")
      expect(response.status).toBe(401)
    })
  })
})
