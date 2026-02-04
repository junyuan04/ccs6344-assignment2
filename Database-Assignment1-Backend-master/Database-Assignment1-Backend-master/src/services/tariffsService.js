const { sql, getPool } = require("../config/db");
const auditService = require("./auditService");

// Audit log helper
async function auditSafe(payload) {
    try { await auditService.logAction(payload); }
    catch (err) { console.warn("Audit log failed:", err.message); }
}

function mapSqlError(err) {
    if (err?.number === 2627 || err?.number === 2601) {
        const e = new Error("Duplicate value");
        e.statusCode = 409;
        throw e;
    }
    if (err?.number === 547) {
        const e = new Error("Operation failed due to related records (FK constraint)");
        e.statusCode = 409;
        throw e;
    }
    throw err;
}

async function getAll(includeInactive = true) {
    const pool = await getPool();
    const q = includeInactive
        ? `SELECT Tariff_ID AS tariffId, Created_By_Profile_ID AS createdByProfileId,
              Effective_From AS effectiveFrom, Rate_Per_kWh AS ratePerKwh,
              Created_At AS createdAt, Is_Active AS isActive
       FROM ebs.Tariff
       ORDER BY Tariff_ID DESC`
        : `SELECT Tariff_ID AS tariffId, Created_By_Profile_ID AS createdByProfileId,
              Effective_From AS effectiveFrom, Rate_Per_kWh AS ratePerKwh,
              Created_At AS createdAt, Is_Active AS isActive
       FROM ebs.Tariff
       WHERE Is_Active = 1
       ORDER BY Tariff_ID DESC`;

    const r = await pool.request().query(q);
    return r.recordset;
}

async function getById(tariffId) {
    const pool = await getPool();
    const r = await pool.request()
        .input("id", sql.Int, tariffId)
        .query(`
      SELECT Tariff_ID AS tariffId, Created_By_Profile_ID AS createdByProfileId,
             Effective_From AS effectiveFrom, Rate_Per_kWh AS ratePerKwh,
             Created_At AS createdAt, Is_Active AS isActive
      FROM ebs.Tariff
      WHERE Tariff_ID = @id
    `);
    return r.recordset[0] || null;
}

async function create(payload, createdByProfileId = null) {
    const { effectiveFrom, ratePerKwh, isActive } = payload;

    if (!effectiveFrom || ratePerKwh == null) {
        const e = new Error("effectiveFrom and ratePerKwh are required");
        e.statusCode = 400;
        throw e;
    }
    if (Number(ratePerKwh) <= 0) {
        const e = new Error("ratePerKwh must be > 0");
        e.statusCode = 400;
        throw e;
    }

    const pool = await getPool();
    try {
        const r = await pool.request()
            .input("createdBy", sql.Int, createdByProfileId)
            .input("effectiveFrom", sql.Date, new Date(effectiveFrom))
            .input("rate", sql.Decimal(10, 4), Number(ratePerKwh))
            .input("active", sql.Bit, isActive == null ? 1 : (isActive ? 1 : 0))
            .query(`
        INSERT INTO ebs.Tariff (Created_By_Profile_ID, Effective_From, Rate_Per_kWh, Is_Active)
        OUTPUT INSERTED.Tariff_ID
        VALUES (@createdBy, @effectiveFrom, @rate, @active)
      `);

        const tariffId = r.recordset[0].Tariff_ID;
        const createdTariff = await getById(tariffId);

        // Audit log
        await auditSafe({
            profileId: createdByProfileId,
            targetRecordId: String(tariffId),
            actionType: "INSERT",
            targetTable: "ebs.Tariff",
            actionDetail: {
                tariffId,
                effectiveFrom: createdTariff?.effectiveFrom,
                ratePerKwh: createdTariff?.ratePerKwh,
                isActive: createdTariff?.isActive
            }
        });

        return createdTariff;
    } catch (err) {
        mapSqlError(err);
    }
}

async function update(tariffId, payload) {
    const current = await getById(tariffId);
    if (!current) {
        const e = new Error("Tariff not found");
        e.statusCode = 404;
        throw e;
    }

    const { effectiveFrom, ratePerKwh, isActive } = payload;

    if (ratePerKwh != null && Number(ratePerKwh) <= 0) {
        const e = new Error("ratePerKwh must be > 0");
        e.statusCode = 400;
        throw e;
    }

    const pool = await getPool();
    try {
        await pool.request()
            .input("id", sql.Int, tariffId)
            .input("effectiveFrom", sql.Date, effectiveFrom ? new Date(effectiveFrom) : null)
            .input("rate", sql.Decimal(10, 4), ratePerKwh != null ? Number(ratePerKwh) : null)
            .input("active", sql.Bit, isActive == null ? null : (isActive ? 1 : 0))
            .query(`
        UPDATE ebs.Tariff
        SET Effective_From = COALESCE(@effectiveFrom, Effective_From),
            Rate_Per_kWh = COALESCE(@rate, Rate_Per_kWh),
            Is_Active = COALESCE(@active, Is_Active)
        WHERE Tariff_ID = @id
      `);

        const updatedTariff = await getById(tariffId);
        const changedFields = Object.keys(payload || {}).filter(k => payload[k] !== undefined);

        await auditSafe({
            profileId: updaterProfileId,
            targetRecordId: String(tariffId),
            actionType: "UPDATE",
            targetTable: "ebs.Tariff",
            actionDetail: { tariffId, fields: changedFields }
        });

        return updatedTariff;
    } catch (err) {
        mapSqlError(err);
    }
}

module.exports = { getAll, getById, create, update };
