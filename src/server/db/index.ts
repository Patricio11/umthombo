import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// Neon's WebSocket driver needs a WebSocket constructor in Node (where there
// isn't a global one). This enables interactive transactions.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

type DB = NeonDatabase<typeof schema>;

let instance: DB | null = null;

function init(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local");
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

/**
 * Drizzle client over Neon's serverless (WebSocket) driver — supports
 * interactive transactions (`db.transaction(...)`). Lazily initialised so
 * importing this module never throws when env is absent.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    if (!instance) instance = init();
    // @ts-expect-error — index into the drizzle instance
    return instance[prop];
  },
});

export { schema };
