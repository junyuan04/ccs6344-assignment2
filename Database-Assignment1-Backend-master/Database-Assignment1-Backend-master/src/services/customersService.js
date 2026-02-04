const bcrypt = require("bcrypt");
const { sql, getPool, queryWithRlsContext } = require("../config/db");
const VALID_STATUS = ["Active", "Inactive", "Suspended"];
const auditService = require("./auditService");

// Audit log helper
async function auditSafe(payload) {
    try {
        await auditService.logAction(payload);
    } catch (err) {
        console.warn("Audit log failed:", err.message);
    }
}

// Set RLS context for a transaction
async function setTxRlsContext(tx, ctx = {}) {
    const r = new sql.Request(tx);
    await r
        .input("__ctxRole", sql.NVarChar(20), ctx.role ?? null)
        .input("__ctxCustomerId", sql.Int, ctx.customerId ?? null)
        .input("__ctxProfileId", sql.Int, ctx.userId ?? ctx.profileId ?? null)
        .query(`
      EXEC sys.sp_set_session_context @key=N'Role',       @value=@__ctxRole;
      EXEC sys.sp_set_session_context @key=N'Customer_ID',@value=@__ctxCustomerId;
      EXEC sys.sp_set_session_context @key=N'Profile_ID', @value=@__ctxProfileId;
    `);
}

// Clear RLS context for a transaction
async function clearTxRlsContext(tx) {
    const r = new sql.Request(tx);
    await r.query(`
    EXEC sys.sp_set_session_context @key=N'Role',       @value=NULL;
    EXEC sys.sp_set_session_context @key=N'Customer_ID',@value=NULL;
    EXEC sys.sp_set_session_context @key=N'Profile_ID', @value=NULL;
  `);
}


function mapSqlError(err) {
    // Unique constraint violations
    if (err?.number === 2627 || err?.number === 2601) {
        const e = new Error("Duplicate value (email or profile or customer unique field already exists)");
        e.statusCode = 409;
        throw e;
    }
    // FK constraint violation
    if (err?.number === 547) {
        const e = new Error("Operation failed due to related records (FK constraint)");
        e.statusCode = 409;
        throw e;
    }
    throw err;
}

// ctx should be: { role, profileId, customerId }
async function getAllCustomers(ctx) {
    const result = await queryWithRlsContext(
        `
    SELECT c.Customer_ID, c.Profile_ID, p.Profile_Name, p.Profile_Email,
           c.Customer_Contact, c.Customer_Address, c.Customer_Status, c.Date_Of_Birth
    FROM ebs.Customer c
    INNER JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    ORDER BY c.Customer_ID DESC;
    `,
        [],
        ctx
    );
    return result.recordset;
}

async function getAll(ctx) {
    const r = await queryWithRlsContext(
        `
    SELECT
      c.Customer_ID AS customerId,
      p.Profile_ID  AS profileId,
      p.Profile_Name AS name,
      p.Profile_Email AS email,
      p.Profile_Type AS type,
      c.Customer_Contact AS contact,
      c.Customer_Address AS address,
      c.Customer_Status AS status,
      c.Date_Of_Birth AS dateOfBirth,
      p.Created_At AS createdAt
    FROM ebs.Customer c
    INNER JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    ORDER BY c.Customer_ID DESC
    `,
        [],
        ctx
    );
    return r.recordset;
}

async function getByProfileId(profileId, ctx) {
    const result = await queryWithRlsContext(
        `
    SELECT 
        c.Customer_ID AS customerId,
        c.Profile_ID AS profileId,
        p.Profile_Name AS name,        
        p.Profile_Email AS email,       
        p.Profile_Type AS type,
        c.Customer_Contact AS contact,  
        c.Customer_Address AS address,  
        c.Customer_Status AS status,
        c.Date_Of_Birth AS dob
    FROM ebs.Customer c
    INNER JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    WHERE c.Profile_ID = @Profile_ID;
    `,
        [{ name: "Profile_ID", type: sql.Int, value: profileId }],
        ctx
    );
    return result.recordset[0] || null;
}

async function create(payload, createdByProfileId = null, actor = null) {
    const {
        name,
        email,
        password,
        contact,
        address,
        status = "Active",       // default to Active
        dateOfBirth,  // optional (YYYY-MM-DD)
    } = payload;

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
    if (status && !VALID_STATUS.includes(status)) {
        const e = new Error(`Invalid Customer_Status. Must be: ${VALID_STATUS.join(", ")}`);
        e.statusCode = 400;
        throw e;
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    try {
        await tx.begin();

        await setTxRlsContext(tx, {
            role: actor?.role ?? "Admin",
            userId: actor?.userId ?? createdByProfileId ?? null,
            customerId: actor?.customerId ?? null,
        });

        const passwordHash = await bcrypt.hash(password, 10);

        // Insert Profile (type fixed to Customer)
        const r1 = await new sql.Request(tx)
            .input("name", sql.NVarChar(100), name)
            .input("type", sql.NVarChar(20), "Customer")
            .input("email", sql.NVarChar(255), email)
            .input("hash", sql.NVarChar(255), passwordHash)
            .input("updatedBy", sql.Int, null)
            .query(`
        INSERT INTO ebs.Profile (Profile_Name, Profile_Type, Profile_Email, Password_Hash, Updated_By_Profile_ID)
        VALUES (@name, @type, @email, @hash, @updatedBy);

        SELECT CAST(SCOPE_IDENTITY() AS INT) AS Profile_ID;
      `);

        const newProfileId = r1.recordset?.[0]?.Profile_ID;
        if (!newProfileId) throw new Error("Failed to create profile (no Profile_ID)");

        // Insert Customer
        await new sql.Request(tx)
            .input("pid", sql.Int, newProfileId)
            .input("contact", sql.NVarChar(30), contact)
            .input("address", sql.NVarChar(255), address)
            .input("status", sql.NVarChar(20), status)
            .input("dob", sql.Date, dateOfBirth ? new Date(dateOfBirth) : null)
            .query(`
        INSERT INTO ebs.Customer (Profile_ID, Customer_Contact, Customer_Address, Customer_Status, Date_Of_Birth)
        VALUES (@pid, @contact, @address, @status, @dob);
      `);

        await clearTxRlsContext(tx);

        await tx.commit();

        const createdRow = await getByProfileId(newProfileId);
        // Audit log
        await auditSafe({
            profileId: createdByProfileId,
            targetRecordId: createdRow?.customerId ?? newProfileId,
            actionType: "INSERT",
            targetTable: "ebs.Customer",
            actionDetail: { profileId: newProfileId, email }
        });

        return await getByProfileId(newProfileId, { role: "Admin" });
    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
        throw err;
    }
}

async function updateByProfileId(profileId, payload, updaterProfileId = null, updaterRole = "Customer") {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Customer not found");
        e.statusCode = 404;
        throw e;
    }

    // Only Staff/Admin can update Profile fields (name, email)
    const allowProfileEdit = updaterRole !== "Customer";

    const { name, email, contact, address, status, dateOfBirth } = payload;

    if (status && !VALID_STATUS.includes(status)) {
        const e = new Error(`Invalid Customer_Status. Must be: ${VALID_STATUS.join(", ")}`);
        e.statusCode = 400;
        throw e;
    }

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
            .input("contact", sql.NVarChar(30), contact ?? null)
            .input("address", sql.NVarChar(255), address ?? null)
            .input("status", sql.NVarChar(20), status ?? null)
            .input("dob", sql.Date, dateOfBirth ? new Date(dateOfBirth) : null)
            .query(`
        UPDATE ebs.Customer
        SET Customer_Contact = COALESCE(@contact, Customer_Contact),
            Customer_Address = COALESCE(@address, Customer_Address),
            Customer_Status  = COALESCE(@status, Customer_Status),
            Date_Of_Birth    = COALESCE(@dob, Date_Of_Birth)
        WHERE Profile_ID = @pid
      `);

        await tx.commit();

        const updatedRow = await getByProfileId(profileId);
        const changedFields = Object.keys(payload || {}).filter(k => payload[k] !== undefined);
        // Audit log
        await auditSafe({
            profileId: updaterProfileId,
            targetRecordId: updatedRow?.customerId ?? profileId,
            actionType: "UPDATE",
            targetTable: "ebs.Customer",
            actionDetail: { profileId, fields: changedFields }
        });
        return await getByProfileId(profileId);
    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
        throw err;
    }
}

async function removeByProfileId(profileId, deletedByProfileId = null) {
    const current = await getByProfileId(profileId);
    if (!current) {
        const e = new Error("Customer not found");
        e.statusCode = 404;
        throw e;
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    try {
        await tx.begin();

        // 1. Get Customer ID first
        const r = await new sql.Request(tx)
            .input("pid", sql.Int, profileId)
            .query("SELECT Customer_ID AS id FROM ebs.Customer WHERE Profile_ID = @pid");
        const customerId = r.recordset[0]?.id;

        if (customerId) {

            await new sql.Request(tx)
                .input("cid", sql.Int, customerId)
                .query("DELETE FROM ebs.ElectricBill WHERE Customer_ID = @cid");

            await new sql.Request(tx)
                .input("cid", sql.Int, customerId)
                .query("DELETE FROM ebs.Feedback WHERE Customer_ID = @cid");

            await new sql.Request(tx)
                .input("cid", sql.Int, customerId)
                .query("DELETE FROM ebs.Customer WHERE Customer_ID = @cid");
        }

        await new sql.Request(tx)
            .input("pid", sql.Int, profileId)
            .query("DELETE FROM ebs.Profile WHERE Profile_ID = @pid");

        await tx.commit();

        // Audit log
        await auditSafe({
            profileId: deletedByProfileId,
            targetRecordId: customerId ?? profileId,
            actionType: "DELETE",
            targetTable: "ebs.Customer",
            actionDetail: { profileId, message: "Cascading delete success" }
        });

        return true;

    } catch (err) {
        try { await tx.rollback(); } catch { }
        mapSqlError(err);
        throw err;
    }
}

module.exports = {
    getAll,
    getByProfileId,
    create,
    updateByProfileId,
    removeByProfileId,
};
