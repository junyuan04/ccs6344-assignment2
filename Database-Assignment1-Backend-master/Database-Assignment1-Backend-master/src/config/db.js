const sql = require("pg");

let pool; // Singleton pool instance

function buildConfig() {
    return {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === "true",
            trustServerCertificate: String(process.env.DB_TRUST_CERT).toLowerCase() === "true",
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };
}

async function getPool() {
    if (pool) return pool;
    const config = buildConfig();
    pool = await sql.connect(config);
    return pool;
}

async function query(text, params = []) {
    const p = await getPool();
    const request = p.request();

    // params: [{ name, type, value }]
    for (const param of params) {
        request.input(param.name, param.type, param.value);
    }

    const result = await request.query(text);
    return result;
}

async function queryWithRlsContext(sqlText, params = [], ctx = {}) {
    const pool = await getPool();
    const request = pool.request();

    // normal params
    params.forEach((p) => request.input(p.name, p.type, p.value));

    // ctx params (use unique names to avoid collision)
    request.input("__ctxRole", sql.NVarChar(20), ctx.role ?? null);
    request.input("__ctxCustomerId", sql.Int, ctx.customerId ?? null);
    request.input("__ctxProfileId", sql.Int, ctx.profileId ?? null);

    const batch = `
    EXEC sys.sp_set_session_context @key=N'Role',       @value=@__ctxRole;
    EXEC sys.sp_set_session_context @key=N'Customer_ID',@value=@__ctxCustomerId;
    EXEC sys.sp_set_session_context @key=N'Profile_ID', @value=@__ctxProfileId;

    ${sqlText}

    EXEC sys.sp_set_session_context @key=N'Role',       @value=NULL;
    EXEC sys.sp_set_session_context @key=N'Customer_ID',@value=NULL;
    EXEC sys.sp_set_session_context @key=N'Profile_ID', @value=NULL;
  `;

    return request.query(batch);
}

module.exports = { sql, getPool, query, queryWithRlsContext };