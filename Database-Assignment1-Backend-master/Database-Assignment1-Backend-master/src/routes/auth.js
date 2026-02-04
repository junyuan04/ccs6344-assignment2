const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController");


router.post("/login", authController.login); // Login Route
router.post("/register", authController.register); // Register Route
/*
// REGISTER Route (customer only)
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, fullName, address, contactNumber } = req.body;

    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      userId: users.length + 1,
      username,
      passwordHash,
      email,
      role: 'Customer',
      accountStatus: 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);

    const newProfile = {
      customerId: customerProfiles.length + 1,
      userId: newUser.userId,
      fullName,
      address: address || '',
      contactNumber: contactNumber || ''
    };

    customerProfiles.push(newProfile);

    auditLogs.push({
      auditId: auditLogs.length + 1,
      userId: newUser.userId,
      actionType: 'INSERT',
      targetTable: 'User',
      actionTimestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
*/

module.exports = router;