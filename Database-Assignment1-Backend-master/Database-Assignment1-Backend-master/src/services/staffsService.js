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
      s.Staff_ID AS staffId,
      p.Profile_ID AS profileId,
      p.Profile_Name AS name,
      p.Profile_Email AS email,
      p.Profile_Type AS type,
      s.Staff_Contact AS contact,
      s.Staff_Address AS address,
      p.Created_At AS createdAt
    FROM ebs.Staff s
    INNER JOIN ebs.Profile p ON p.Profile_ID = s.Profile_ID
    ORDER BY s.Staff_ID DESC
  `);
    return r.recordset;
}

async function getByProfileId(profileId) {
    const pool = await getPool();
    const r = await pool.request()
        .input("pid", sql.Int, profileId)
        .query(`
      SELECT
        s.Staff_ID AS staffId,
        p.Profile_ID AS profileId,
        p.Profile_Name AS name,
        p.Profile_Email AS email,
        p.Profile_Type AS type,
        s.Staff_Contact AS contact,
        s.Staff_Address AS address,
        p.Created_At AS createdAt
      FROM ebs.Staff s
      INNER JOIN ebs.Profile p ON p.Profile_ID = s.Profile_ID
      WHERE s.Profile_ID = @pid
    `);
    return r.recordset[0] || null;
}

// Admin creates Staff (Profile + Staff)
async function create(payload, createdByProfileId = null) {
    const { name, email, password, contact, address } = payload;

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

        // Insert Profile type fixed to Staff
        const insertProfile = await new sql.Request(tx)
            .input("name", sql.NVarChar, name)
            .input("type", sql.NVarChar, "Staff")
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
            .input("contact", sql.NVarChar, contact ?? null)
            .input("address", sql.NVarChar, address ?? null)
            .query(`
        INSERT INTO ebs.Staff (Profile_ID, Staff_Contact, Staff_Address)
        VALUES (@pid, @contact, @address)
      `);

        await tx.commit();

        const createdRow = await getByProfileId(newProfileId);

        // Audit log
        await auditSafe({
            profileId: createdByProfileId,
            targetRecordId: createdRow?.staffId ?? newProfileId,
            actionType: "INSERT",
            targetTable: "ebs.Staff",
            actionDetail: { profileId: newProfileId, email }
        });

        return createdRow;

    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
    }
}

async function updateByProfileId(profileId, payload, updaterProfileId = null, updaterRole = "Staff") {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Staff not found");
        e.statusCode = 404;
        throw e;
    }

    // Only Admin can update Profile fields (name, email)
    const allowProfileEdit = updaterRole === "Admin";

    const { name, email, contact, address } = payload;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    try {
        await tx.begin();

        if (allowProfileEdit) {
            await new sql.Request(tx)
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
        }

        await new sql.Request(tx)
            .input("pid", sql.Int, profileId)
            .input("contact", sql.NVarChar, contact ?? null)
            .input("address", sql.NVarChar, address ?? null)
            .query(`
        UPDATE ebs.Staff
        SET Staff_Contact = COALESCE(@contact, Staff_Contact),
            Staff_Address = COALESCE(@address, Staff_Address)
        WHERE Profile_ID = @pid
      `);

        await tx.commit();

        const updatedRow = await getByProfileId(profileId);
        const changedFields = Object.keys(payload || {}).filter(k => payload[k] !== undefined);

        // Audit log
        await auditSafe({
            profileId: updaterProfileId,
            targetRecordId: updatedRow?.staffId ?? profileId,
            actionType: "UPDATE",
            targetTable: "ebs.Staff",
            actionDetail: { profileId, fields: changedFields }
        });

        return updatedRow;

    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
    }
}

async function removeByProfileId(profileId) {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Staff not found");
        e.statusCode = 404;
        throw e;
    }

    // ON DELETE CASCADE -> delete Profile will delete Staff
    const pool = await getPool();
    const existing = await pool.request()
        .input("pid", sql.Int, profileId)
        .query(`SELECT Staff_ID AS staffId FROM ebs.Staff WHERE Profile_ID=@pid`);

    const staffId = existing.recordset?.[0]?.staffId ?? null;

    try {
        await pool.request()
            .input("pid", sql.Int, profileId)
            .query(`DELETE FROM ebs.Profile WHERE Profile_ID = @pid`);

        await auditSafe({
            profileId: deletedByProfileId,
            targetRecordId: staffId ?? profileId,
            actionType: "DELETE",
            targetTable: "ebs.Staff",
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
