import { defineConfig } from "drizzle-kit";
import env from "./env.ts";

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!;
console.log(url)

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
