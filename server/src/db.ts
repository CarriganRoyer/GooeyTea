import { Pool } from "pg";

const ssl =
  process.env.PG_SSL?.toLowerCase() === "true"
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});

export async function ping() {
  await pool.query("SELECT 1");
}
