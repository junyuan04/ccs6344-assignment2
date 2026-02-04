const bcrypt = require("bcrypt");
const { sql, getPool } = require("../config/db");
const auditService = require("./auditService");

// Audit log helper
async function auditSafe(payload) {
    try {
        await auditService.logAction(payload);
    } catch (err) {
        console.warn("Audit log failed:", err.message);
    }
}

function mapSqlError(err) {
    if (err?.number === 2627 || err?.number === 2601) {
        const e = new Error("Duplicate value (email/profile already exists)");
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

async function getAll() {
    const pool = await getPool();
    const r = await pool.request().query(`
    SELECT
      a.Admin_ID AS adminId,
      p.Profile_ID AS profileId,
      p.Profile_Name AS name,
      p.Profile_Email AS email,
      p.Profile_Type AS type,
      p.Created_At AS createdAt
    FROM ebs.Admin a
    INNER JOIN ebs.Profile p ON p.Profile_ID = a.Profile_ID
    ORDER BY a.Admin_ID DESC
  `);
    return r.recordset;
}

async function getByProfileId(profileId) {
    const pool = await getPool();
    const r = await pool.request()
        .input("pid", sql.Int, profileId)
        .query(`
      SELECT
        a.Admin_ID AS adminId,
        p.Profile_ID AS profileId,
        p.Profile_Name AS name,
        p.Profile_Email AS email,
        p.Profile_Type AS type,
        p.Created_At AS createdAt
      FROM ebs.Admin a
      INNER JOIN ebs.Profile p ON p.Profile_ID = a.Profile_ID
      WHERE a.Profile_ID = @pid
    `);
    return r.recordset[0] || null;
}

// Admin creates Admin account (Profile + Admin)
async function create(payload, createdByProfileId = null) {
    const { name, email, password } = payload;

    if (!name || !email || !password) {
        const e = new Error("name, email, password are required");
        e.statusCode = 400;
        throw e;
    }
    if (password.length < 8) {
        const e = new Error("Password must be at least 8 characters");
        e.statusCode = 400;
        throw e;
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    try {
        await tx.begin();

        const hash = await bcrypt.hash(password, 10);

        const insertProfile = await new sql.Request(tx)
            .input("name", sql.NVarChar, name)
            .input("type", sql.NVarChar, "Admin")
            .input("email", sql.NVarChar, email)
            .input("hash", sql.NVarChar, hash)
            .input("updatedBy", sql.Int, createdByProfileId)
            .query(`
        INSERT INTO ebs.Profile (Profile_Name, Profile_Type, Profile_Email, Password_Hash, Updated_By_Profile_ID)
        OUTPUT INSERTED.Profile_ID
        VALUES (@name, @type, @email, @hash, @updatedBy)
      `);

        const newProfileId = insertProfile.recordset[0].Profile_ID;

        await new sql.Request(tx)
            .input("pid", sql.Int, newProfileId)
            .query(`
        INSERT INTO ebs.Admin (Profile_ID)
        VALUES (@pid)
      `);

        await tx.commit();

        const createdRow = await getByProfileId(newProfileId);

        // Audit log
        await auditSafe({
            profileId: createdByProfileId,
            targetRecordId: createdRow?.adminId ?? newProfileId,
            actionType: "INSERT",
            targetTable: "ebs.Admin",
            actionDetail: { profileId: newProfileId, email }
        });

        return await getByProfileId(newProfileId);

    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
    }
}

// Only Admin updates Admin Profile info (name, email)
async function updateByProfileId(profileId, payload, updaterProfileId = null) {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Admin not found");
        e.statusCode = 404;
        throw e;
    }

    const { name, email } = payload;

    const pool = await getPool();
    try {
        await pool.request()
            .input("pid", sql.Int, profileId)
            .input("name", sql.NVarChar, name ?? null)
            .input("email", sql.NVarChar, email ?? null)
            .input("updatedBy", sql.Int, updaterProfileId)
            .query(`
        UPDATE ebs.Profile
        SET Profile_Name = COALESCE(@name, Profile_Name),
            Profile_Email = COALESCE(@email, Profile_Email),
            Updated_By_Profile_ID = @updatedBy
        WHERE Profile_ID = @pid
      `);

        const updatedRow = await getByProfileId(profileId);
        const changedFields = Object.keys(payload || {}).filter(k => payload[k] !== undefined);

        // Audit log
        await auditSafe({
            profileId: updaterProfileId,
            targetRecordId: updatedRow?.adminId ?? profileId,
            actionType: "UPDATE",
            targetTable: "ebs.Admin",
            actionDetail: { profileId, fields: changedFields }
        });

        return await getByProfileId(profileId);
    } catch (err) {
        mapSqlError(err);
    }
}

async function removeByProfileId(profileId, deletedByProfileId = null) {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Admin not found");
        e.statusCode = 404;
        throw e;
    }

    // ON DELETE CASCADE -> delete Profile will delete Admin
    const pool = await getPool();
    const existing = await pool.request()
        .input("pid", sql.Int, profileId)
        .query(`SELECT Admin_ID AS adminId FROM ebs.Admin WHERE Profile_ID=@pid`);

    const adminId = existing.recordset?.[0]?.adminId ?? null;

    try {
        await pool.request()
            .input("pid", sql.Int, profileId)
            .query(`DELETE FROM ebs.Profile WHERE Profile_ID = @pid`);

        // Audit log
        await auditSafe({
            profileId: deletedByProfileId,
            targetRecordId: adminId ?? profileId,
            actionType: "DELETE",
            targetTable: "ebs.Admin",
            actionDetail: { profileId }
        });

        return true;
    } catch (err) {
        mapSqlError(err);
    }
}

module.exports = {
    getAll,
    getByProfileId,
    create,
    updateByProfileId,
    removeByProfileId,
};
