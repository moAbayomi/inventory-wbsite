import request from "supertest"
import app from "../../src/server.ts";
import { cleanupDb, createTestUser } from "../setup/dbHelpers.ts"

describe("Invites Endpoints", () => {
  let authToken: string;
  
  beforeAll(async () => {
    const { token, user } = await createTestUser({ role: "ADMIN" as const })
    authToken = token;
  })

  afterEach(async () => {
    await cleanupDb()
  })

  describe("POST /api/v1/invites/create-invite", () => {
    it("should create a invite. this newly created which the new user is going to use to get theirself registered", async () => {

      const inviteCredentials = { email: `test-${Date.now()}@email.com` }
      const response = await request(app)
        .post("/api/v1/invites/create-invite")
        .set("Authorization", `Bearer ${authToken}`)
        .send(inviteCredentials)
        .expect(201)

      expect(response.body.message).toBe("invite sent successfully")
    })
  })

  describe("POST /api/v1/invites/accept-invite/", () => {
    it("should accept invite thereby create a new user", async () => {

      const inviteCredentials = { email: `test-${Date.now()}@email.com` }
      const response = await request(app)
        .post("/api/v1/invites/create-invite")
        .set("Authorization", `Bearer ${authToken}`)
        .send(inviteCredentials)
        .expect(201)

      const acceptInviteCredentials = {
        token: response.body.inviteToken,
        name: "Test name",
        password: "Testpassword1234",
        confirmPassword: "Testpassword1234"
      }

      const finalResponse = await request(app)
        .post("/api/v1/invites/accept-invite")
        .send(acceptInviteCredentials)
        .expect(200)

      expect(finalResponse.body.message).toBe("user created successfully")
      expect(finalResponse.body).toHaveProperty("user")
    })
  })
})
