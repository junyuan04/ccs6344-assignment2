const { sql, query } = require("../config/db");

// Helper to create SQL parameter
function p(name, type, value) {
    return { name, type, value };
}
// Log an action to the AuditLog table
async function logAction({
    profileId = null,
    targetRecordId,
    actionType,       // 'INSERT' | 'UPDATE' | 'DELETE'
    targetTable,      // e.g. 'ebs.Customer'
    actionDetail = null, // string or object
}) {
    // Preventing objects from being directly inserted into SQL
    const detailStr =
        actionDetail == null
            ? null
            : typeof actionDetail === "string"
                ? actionDetail
                : JSON.stringify(actionDetail);

    const r = await query(
        `
    INSERT INTO ebs.AuditLog (Profile_ID, Target_Record_ID, Action_Type, Target_Table, Action_Detail)
    VALUES (@profileId, @targetRecordId, @actionType, @targetTable, @detailStr);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS logId;
    `,
        [
            p("profileId", sql.Int, profileId),
            p("targetRecordId", sql.NVarChar(100), String(targetRecordId)),
            p("actionType", sql.NVarChar(10), actionType),
            p("targetTable", sql.NVarChar(128), targetTable),
            p("detailStr", sql.NVarChar(sql.MAX), detailStr),
        ]
    );

    const logId = r.recordset?.[0]?.logId;
    return { logId };
}

async function getAuditLogById(id) {
    const r = await query(
        `
    SELECT Log_ID AS logId,
           Profile_ID AS profileId,
           Target_Record_ID AS targetRecordId,
           Action_Type AS actionType,
           Target_Table AS targetTable,
           Action_Timestamp AS actionTimestamp,
           Action_Detail AS actionDetail
    FROM ebs.AuditLog
    WHERE Log_ID = @id
    `,
        [p("id", sql.Int, Number(id))]
    );
    return r.recordset[0] || null;
}

async function listAuditLogs(filters = {}) {
    const {
        table,
        action,
        profileId,
        from,
        to,
        keyword,
        page = 1,
        limit = 20,
    } = filters;

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    let where = `WHERE 1=1`;
    const params = [
        p("offset", sql.Int, offset),
        p("fetch", sql.Int, safeLimit),
    ];

    if (table) {
        where += ` AND Target_Table = @table`;
        params.push(p("table", sql.NVarChar(128), table));
    }
    if (action) {
        where += ` AND Action_Type = @action`;
        params.push(p("action", sql.NVarChar(10), action));
    }
    if (profileId) {
        where += ` AND Profile_ID = @profileId`;
        params.push(p("profileId", sql.Int, Number(profileId)));
    }
    if (from) {
        where += ` AND Action_Timestamp >= @from`;
        params.push(p("from", sql.DateTime2, new Date(from)));
    }
    if (to) {
        where += ` AND Action_Timestamp <= @to`;
        params.push(p("to", sql.DateTime2, new Date(to)));
    }
    if (keyword) {
        // keyword search（Target_Record_ID / Action_Detail）
        where += ` AND (Target_Record_ID LIKE @kw OR Action_Detail LIKE @kw)`;
        params.push(p("kw", sql.NVarChar(200), `%${keyword}%`));
    }

    // total
    const countRes = await query(
        `SELECT COUNT(1) AS total FROM ebs.AuditLog ${where}`,
        params.filter(x => !["offset", "fetch"].includes(x.name))
    );
    const total = countRes.recordset?.[0]?.total || 0;

    // page data
    const dataRes = await query(
        `
    SELECT Log_ID AS logId,
           Profile_ID AS profileId,
           Target_Record_ID AS targetRecordId,
           Action_Type AS actionType,
           Target_Table AS targetTable,
           Action_Timestamp AS actionTimestamp,
           Action_Detail AS actionDetail
    FROM ebs.AuditLog
    ${where}
    ORDER BY Action_Timestamp DESC
    OFFSET @offset ROWS FETCH NEXT @fetch ROWS ONLY
    `,
        params
    );

    return { page: safePage, limit: safeLimit, total, logs: dataRes.recordset || [] };
}

module.exports = {
    logAction,
    getAuditLogById,
    listAuditLogs,
};
