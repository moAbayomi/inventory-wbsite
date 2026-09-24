import { env as loadenv } from "custom-env";
import { z } from "zod";
import { fileURLToPath } from "url";
import path from "path";

process.env.APP_STAGE = process.env.APP_STAGE || "dev";

const isProduction = process.env.APP_STAGE === "production";
const isDevelopment = process.env.APP_STAGE === "dev";
const isTesting = process.env.APP_STAGE === "test";

if (isDevelopment) {
  loadenv();
} else if (isTesting) {
  loadenv("test");
}
console.log("[env.ts] cwd:", process.cwd());
console.log("[env.ts] NODE_ENV:", process.env.NODE_ENV);
console.log("[env.ts] APP_STAGE:", process.env.APP_STAGE);
// Was logging the *entire* DATABASE_URL, password included, to stdout on
// every single boot -- anywhere that log line ends up (a terminal's
// scrollback, a log file, a CI run) then has your live Neon password sitting
// in plain text. Logging that it loaded, without the secret itself, is
// enough to confirm the env var came through.
console.log(
  "[env.ts] DATABASE_URL after loadenv:",
  process.env.DATABASE_URL ? "(set)" : "(missing)",
);
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_STAGE: z.enum(["dev", "test", "production"]).default("dev"),
  PORT: z.coerce.number().positive().default(3000),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  DATABASE_URL_DIRECT: z.string().startsWith("postgresql://").optional(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_FROM_EMAIL: z.string(),
  FRONTEND_URL: z.string(),
  JWT_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().positive().default(2),
  INVITE_EXPIRES_DAYS: z.coerce.number().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
  // Comma-separated list of origins allowed to call the API with credentials
  // (cookies). Wide-open cors() is not safe once the frontend and backend
  // live on different origins in production.
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:3001"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (e) {
  if (e instanceof z.ZodError) {
    console.log("invalid env variables");
    console.error(JSON.stringify(e.flatten().fieldErrors, null, 2));

    e.issues.forEach((err) => {
      const path = err.path.join(".");
      console.log(`${path}: ${err.message}`);
    });

    process.exit(1);
  }

  throw e;
}

export const isProd = () => env.APP_STAGE === "production";
export const isTest = () => env.APP_STAGE === "test";
export const isDev = () => env.APP_STAGE === "dev";

export const getAllowedOrigins = (): string[] =>
  env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

export { env };
export default env;
