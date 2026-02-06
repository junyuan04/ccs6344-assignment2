// src/db.js (PostgreSQL version)
const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || process.env.DB_HOST,
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      database: process.env.PGDATABASE || process.env.DB_NAME,
      user: process.env.PGUSER || process.env.DB_USER,
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      ssl:
        (process.env.PGSSL || process.env.DB_SSL) === "true"
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function testConnection() {
  const p = getPool();
  const r = await p.query("SELECT 1 as ok");
  return r.rows?.[0]?.ok === 1;
}

/**
 * Optional: If you still want “RLS-like context”, you can store variables
 * and reference them in policies via current_setting('app.user_id', true).
 */
async function queryWithRlsContext(sqlText, params, context = {}) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");

    // set_config(key, value, is_local)
    if (context.user_id != null) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [
        String(context.user_id),
      ]);
    }
    if (context.role != null) {
      await client.query("SELECT set_config('app.role', $1, true)", [
        String(context.role),
      ]);
    }

    const result = await client.query(sqlText, params);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getPool, testConnection, queryWithRlsContext };
