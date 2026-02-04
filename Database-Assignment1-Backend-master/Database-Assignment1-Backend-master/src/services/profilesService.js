const bcrypt = require("bcrypt");
const { sql, query } = require("../config/db");

const VALID_TYPES = ["Staff", "Customer", "Admin"];

function validateType(type) {
    if (!VALID_TYPES.includes(type)) {
        const err = new Error(`Invalid Profile_Type. Must be one of: ${VALID_TYPES.join(", ")}`);
        err.statusCode = 400;
        throw err;
    }
}

async function getAll() {
    const result = await query(`
    SELECT Profile_ID AS profileId,
           Profile_Name AS name,
           Profile_Type AS type,
           Profile_Email AS email,
           Created_At AS createdAt,
           Updated_By_Profile_ID AS updatedByProfileId
    FROM ebs.Profile
    ORDER BY Profile_ID DESC
  `);
    return result.recordset;
}

async function getById(id) {
    const result = await query(
        `
    SELECT Profile_ID AS profileId,
           Profile_Name AS name,
           Profile_Type AS type,
           Profile_Email AS email,
           Created_At AS createdAt,
           Updated_By_Profile_ID AS updatedByProfileId
    FROM ebs.Profile
    WHERE Profile_ID = @id
    `,
        [{ name: "id", type: sql.Int, value: id }]
    );
    return result.recordset[0] || null;
}

async function create(body, updatedByProfileId = null) {
    const { name, type, email, password } = body;

    if (!name || !type || !email || !password) {
        const err = new Error("name, type, email, password are required");
        err.statusCode = 400;
        throw err;
    }

    validateType(type);

    // unique email check
    const exists = await query(
        `SELECT 1 AS ok FROM ebs.Profile WHERE Profile_Email = @email`,
        [{ name: "email", type: sql.NVarChar, value: email }]
    );
    if (exists.recordset.length > 0) {
        const err = new Error("Email already exists");
        err.statusCode = 409;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await query(
        `
    INSERT INTO ebs.Profile (Profile_Name, Profile_Type, Profile_Email, Password_Hash, Updated_By_Profile_ID)
    OUTPUT INSERTED.Profile_ID
    VALUES (@name, @type, @email, @hash, @updatedBy)
    `,
        [
            { name: "name", type: sql.NVarChar, value: name },
            { name: "type", type: sql.NVarChar, value: type },
            { name: "email", type: sql.NVarChar, value: email },
            { name: "hash", type: sql.NVarChar, value: passwordHash },
            { name: "updatedBy", type: sql.Int, value: updatedByProfileId },
        ]
    );

    const newId = insert.recordset[0].Profile_ID;
    return await getById(newId);
}

async function update(id, body, updatedByProfileId = null) {
    const current = await getById(id);
    if (!current) {
        const err = new Error("Profile not found");
        err.statusCode = 404;
        throw err;
    }

    const { name, type, email, password } = body;

    if (type) validateType(type);

    // unique email check
    if (email && email !== current.email) {
        const exists = await query(
            `SELECT 1 AS ok FROM ebs.Profile WHERE Profile_Email = @email AND Profile_ID <> @id`,
            [
                { name: "email", type: sql.NVarChar, value: email },
                { name: "id", type: sql.Int, value: id },
            ]
        );
        if (exists.recordset.length > 0) {
            const err = new Error("Email already exists");
            err.statusCode = 409;
            throw err;
        }
    }

    let passwordHash = null;
    if (password) passwordHash = await bcrypt.hash(password, 10);

    await query(
        `
    UPDATE ebs.Profile
    SET Profile_Name = COALESCE(@name, Profile_Name),
        Profile_Type = COALESCE(@type, Profile_Type),
        Profile_Email = COALESCE(@email, Profile_Email),
        Password_Hash = COALESCE(@hash, Password_Hash),
        Updated_By_Profile_ID = @updatedBy
    WHERE Profile_ID = @id
    `,
        [
            { name: "name", type: sql.NVarChar, value: name ?? null },
            { name: "type", type: sql.NVarChar, value: type ?? null },
            { name: "email", type: sql.NVarChar, value: email ?? null },
            { name: "hash", type: sql.NVarChar, value: passwordHash ?? null },
            { name: "updatedBy", type: sql.Int, value: updatedByProfileId },
            { name: "id", type: sql.Int, value: id },
        ]
    );

    return await getById(id);
}

async function remove(id) {
    const current = await getById(id);
    if (!current) {
        const err = new Error("Profile not found");
        err.statusCode = 404;
        throw err;
    }

    await query(
        `DELETE FROM ebs.Profile WHERE Profile_ID = @id`,
        [{ name: "id", type: sql.Int, value: id }]
    );
}

module.exports = { getAll, getById, create, update, remove };