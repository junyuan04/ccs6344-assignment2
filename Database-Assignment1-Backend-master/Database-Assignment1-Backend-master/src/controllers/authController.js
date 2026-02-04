const authService = require("../services/authService");

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Username and password required" });
    }

    const result = await authService.login({ username, password });

    res.json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { username, password, email, fullName, contact, address } = req.body;

    if (!username || !password || !email) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Username, password, and email are required",
        });
    }

    await authService.register({
      username,
      password,
      email,
      fullName,
      contact,
      address,
    });

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register };
