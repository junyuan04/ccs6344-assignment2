// src/config/db.js  (PostgreSQL version using pg Pool)
const { Pool } = require("pg");

let pool; // singleton

function buildConfig() {
  // Support both styles:
  // 1) DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
  // 2) DB_SERVER/DB_DATABASE (your old naming)
  const host = process.env.DB_HOST || process.env.DB_SERVER;
  const port = Number(process.env.DB_PORT || 5432);
  const database = process.env.DB_NAME || process.env.DB_DATABASE;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !database || !user || !password) {
    throw new Error(
      "Missing DB env vars. Need DB_HOST(or DB_SERVER), DB_NAME(or DB_DATABASE), DB_USER, DB_PASSWORD."
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    // RDS usually requires SSL; in sandbox you may use rejectUnauthorized=false
    ssl:
      String(process.env.DB_SSL || "true").toLowerCase() === "true"
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
  };
}

async function getPool() {
  if (pool) return pool;
  const config = buildConfig();
  pool = new Pool(config);

  // test connection once
  await pool.query("SELECT 1");
  return pool;
}

async function query(text, params = []) {
  const p = await getPool();
  return p.query(text, params);
}

// Keep API for compatibility; if you still have RLS logic later,
// implement via SET LOCAL or application logic (Postgres differs from MSSQL)
async function queryWithRlsContext(sqlText, params = [], ctx = {}) {
  // Minimal no-op wrapper for now
  return query(sqlText, params);
}

module.exports = { getPool, query, queryWithRlsContext };
