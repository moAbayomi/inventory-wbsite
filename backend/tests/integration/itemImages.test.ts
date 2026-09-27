import request from "supertest";
import app from "../../src/server.ts";
import env from "../../env.ts";
import { createTestUser } from "../setup/dbHelpers.ts";

const R2_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
  "R2_ENDPOINT",
] as const;

describe("POST /api/v1/items/images/upload-url", () => {
  let authToken: string;
  const saved = {} as Record<(typeof R2_KEYS)[number], string | undefined>;

  beforeAll(async () => {
    const { token } = await createTestUser();
    authToken = token;
    for (const k of R2_KEYS) saved[k] = env[k];
  });

  afterEach(() => {
    for (const k of R2_KEYS) env[k] = saved[k];
  });

  const configureStorage = () => {
    env.R2_ACCOUNT_ID = "testaccount";
    env.R2_ACCESS_KEY_ID = "test-key";
    env.R2_SECRET_ACCESS_KEY = "test-secret";
    env.R2_BUCKET = "item-photos";
    env.R2_PUBLIC_URL = "https://images.example.com/";
  };

  it("should answer 503 when storage isn't configured", async () => {
    for (const k of R2_KEYS) env[k] = undefined;

    const response = await request(app)
      .post("/api/v1/items/images/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ content_type: "image/jpeg", size: 1000 })
      .expect(503);

    expect(response.body.error).toBe("image uploads are not set up yet");
  });

  it("should return a signed upload URL and the public URL to save", async () => {
    configureStorage();

    const response = await request(app)
      .post("/api/v1/items/images/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ content_type: "image/webp", size: 200_000 })
      .expect(201);

    const { upload_url, public_url } = response.body;
    expect(public_url).toMatch(
      /^https:\/\/images\.example\.com\/items\/[0-9a-f-]{36}\.webp$/,
    );

    const url = new URL(upload_url);
    expect(url.host).toBe("testaccount.r2.cloudflarestorage.com");
    // Same object key the public URL points at.
    expect(url.pathname).toBe(`/item-photos/${new URL(public_url).pathname.slice(1)}`);
    // Content-Type is signed, so the URL can't be reused for another file type.
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    // A checksum baked in at signing time is of an empty body and makes
    // every real upload fail.
    expect([...url.searchParams.keys()].some((k) => k.startsWith("x-amz-checksum"))).toBe(false);
  });

  it("should reject a file type that isn't an image", async () => {
    configureStorage();

    await request(app)
      .post("/api/v1/items/images/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ content_type: "text/html", size: 1000 })
      .expect(400);
  });

  it("should reject an image over 5MB", async () => {
    configureStorage();

    await request(app)
      .post("/api/v1/items/images/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ content_type: "image/jpeg", size: 6 * 1024 * 1024 })
      .expect(400);
  });

  it("should require authentication", async () => {
    await request(app)
      .post("/api/v1/items/images/upload-url")
      .send({ content_type: "image/jpeg", size: 1000 })
      .expect(401);
  });
});
