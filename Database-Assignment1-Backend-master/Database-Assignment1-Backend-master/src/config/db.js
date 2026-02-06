const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    const {
      DB_HOST,
      DB_PORT,
      DB_NAME,
      DB_USER,
      DB_PASSWORD,
    } = process.env;

    if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error(
        "Missing DB env vars. Need DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
      );
    }

    pool = new Pool({
      host: DB_HOST,
      port: Number(DB_PORT),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,

      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  const res = await p.query(text, params);
  return res;
}

async function queryWithRlsContext(text, params = [], ctx = {}) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");

    if (ctx.user_id != null) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [
        String(ctx.user_id),
      ]);
    }
    if (ctx.role != null) {
      await client.query("SELECT set_config('app.role', $1, true)", [
        String(ctx.role),
      ]);
    }

    const res = await client.query(text, params);
    await client.query("COMMIT");
    return res;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getPool, query, queryWithRlsContext };
