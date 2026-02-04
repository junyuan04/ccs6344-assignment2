const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sql, query, queryWithRlsContext } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

async function login({ username, password }) {
  const result = await query(
    `
    SELECT TOP 1 Profile_ID, Profile_Name, Profile_Email, Profile_Type, Password_Hash
    FROM ebs.Profile
    WHERE Profile_Email = @login OR Profile_Name = @login
    ORDER BY Profile_ID DESC
    `,
    [{ name: "login", type: sql.NVarChar, value: username }]
  );

  const user = result.recordset[0];
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // Verify password
  const ok = await bcrypt.compare(password, user.Password_Hash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

    // for Customer role, fetch Customer_ID (bypass RLS using Role=Admin inside backend)
    let customerId = null;
    if (user.Profile_Type === "Customer") {
        const c = await queryWithRlsContext(
            `SELECT TOP 1 Customer_ID FROM ebs.Customer WHERE Profile_ID = @pid;`,
            [{ name: "pid", type: sql.Int, value: user.Profile_ID }],
            { role: "Admin" } // server-side bypass, safe because we clear after each query
        );
        customerId = c.recordset[0]?.Customer_ID ?? null;
    }

    const token = jwt.sign(
        {
            userId: user.Profile_ID,
            username: user.Profile_Name,
            role: user.Profile_Type,
            customerId,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    return {
        token,
        user: {
            userId: user.Profile_ID,
            username: user.Profile_Name,
            email: user.Profile_Email,
            role: user.Profile_Type,
            customerId,
        },
    };
}

async function register({
  username,
  password,
  email,
  fullName,
  contact,
  address,
}) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const check = await transaction
      .request()
      .input("email", sql.NVarChar, email)
      .input("name", sql.NVarChar, username)
      .query(
        "SELECT Profile_ID FROM ebs.Profile WHERE Profile_Email = @email OR Profile_Name = @name"
      );

    if (check.recordset.length > 0) {
      const error = new Error("Username or Email already exists");
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const profileResult = await transaction
      .request()
      .input("name", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .input("hash", sql.NVarChar, passwordHash).query(`
                INSERT INTO ebs.Profile (Profile_Name, Profile_Type, Profile_Email, Password_Hash)
                OUTPUT INSERTED.Profile_ID
                VALUES (@name, 'Customer', @email, @hash)
            `);

    const newProfileId = profileResult.recordset[0].Profile_ID;

    await transaction
      .request()
      .input("pid", sql.Int, newProfileId)
      .input("contact", sql.NVarChar, contact)
      .input("address", sql.NVarChar, address).query(`
                INSERT INTO ebs.Customer (Profile_ID, Customer_Contact, Customer_Address, Customer_Status)
                VALUES (@pid, @contact, @address, 'Active')
            `);

    await transaction.commit();

    return { message: "Registration successful" };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = { login, register };
