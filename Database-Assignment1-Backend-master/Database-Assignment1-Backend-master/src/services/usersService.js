const { sql, query } = require("../config/db");

// Fetch all users
async function getAllUsers() {
    const result = await query(`
    SELECT Profile_ID AS userId,
           Profile_Name AS username,
           Profile_Email AS email,
           Profile_Type AS role,
           Created_At AS createdAt
    FROM ebs.Profile
    ORDER BY Profile_ID DESC
  `);
    return result.recordset;
}

// Fetch user by ID
async function getUserById(userId) {
    const result = await query(
        `
    SELECT Profile_ID AS userId,
           Profile_Name AS username,
           Profile_Email AS email,
           Profile_Type AS role,
           Created_At AS createdAt
    FROM ebs.Profile
    WHERE Profile_ID = @id
    `,
        [{ name: "id", type: sql.Int, value: userId }]
    );

    return result.recordset[0] || null;
}

module.exports = { getAllUsers, getUserById };