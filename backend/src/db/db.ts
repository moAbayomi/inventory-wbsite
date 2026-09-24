import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";
import { env, isProd } from "../../env.ts";
import { remember } from "@epic-web/remember";

const createPool = () => {
	const pool = new Pool({
		connectionString: env.DATABASE_URL,
	});

	// Without this, an idle client that Neon's pooler closes on its own
	// (which it does after a short idle period -- normal on the free/serverless
	// tier, not a bug on our end) fires an 'error' event on the pool. Node's
	// default behaviour for an unhandled 'error' event on any EventEmitter is
	// to throw it as an uncaught exception, which -- since nothing here was
	// catching it -- silently killed the *entire* process. That's the "the
	// backend just quits on its own after a while, no error printed" bug:
	// `npm run dev` (tsx watch) masked it by auto-restarting on crash, but
	// `node src/index.ts` / `npm start` has no such auto-restart, so it just
	// stayed dead. Logging here instead of doing nothing keeps the pool (and
	// the process) alive; pg reconnects a fresh client for the next query.
	pool.on("error", (err) => {
		console.error("[db] idle client error (pool stays up):", err.message);
	});

	return pool;
};

let client;
if (isProd()) {
	client = createPool();
} else {
	client = remember("dbPool", () => createPool());
}

export const db = drizzle({ client, schema });
export default db;
