import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../../env.ts";

// Item photos live in a Cloudflare R2 bucket, not in Postgres or on this
// server's disk. The browser uploads the file straight to R2 using a
// short-lived signed URL this module hands out, so the photo bytes never
// pass through the API -- the API only ever stores the resulting public URL
// in items.image_url.

export const IMAGE_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageContentType = keyof typeof IMAGE_CONTENT_TYPES;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const UPLOAD_URL_EXPIRES_SECONDS = 5 * 60;

let client: S3Client | undefined;

export const isStorageConfigured = () =>
  Boolean(
    (env.R2_ENDPOINT || env.R2_ACCOUNT_ID) &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_PUBLIC_URL,
  );

function getClient(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint:
      env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    // Bucket in the path rather than the hostname -- works for R2 and for
    // any local S3-compatible server alike.
    forcePathStyle: true,
    // Without this the SDK bakes a checksum of the (empty, at signing time)
    // request body into the signed URL, and every real upload then fails
    // with a checksum mismatch.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export async function createImageUploadUrl(contentType: ImageContentType) {
  const key = `items/${randomUUID()}.${IMAGE_CONTENT_TYPES[contentType]}`;

  // ContentType is part of the signature, so the upload has to be sent with
  // exactly this Content-Type header -- someone holding the URL can't use
  // it to put, say, an HTML page in the bucket instead of an image.
  const upload_url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    {
      expiresIn: UPLOAD_URL_EXPIRES_SECONDS,
      // By default the presigner moves Content-Type into the query string
      // and leaves it unsigned; keep it a signed header instead.
      signableHeaders: new Set(["content-type"]),
      unhoistableHeaders: new Set(["content-type"]),
    },
  );

  const public_url = `${env.R2_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;

  return { upload_url, public_url, key };
}
