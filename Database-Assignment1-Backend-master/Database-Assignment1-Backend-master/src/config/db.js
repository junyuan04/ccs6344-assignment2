// db.js (PostgreSQL)
const { Pool } = require("pg");

let pool;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.DB_HOST,              // app-database....rds.amazonaws.com
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,          // appdb
    user: process.env.DB_USER,              // dbadmin
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  const res = await p.query(text, params);
  return res;
}

module.exports = { getPool, query };
