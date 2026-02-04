const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const usersController = require("../controllers/usersController");


// Admin only
router.get("/", verifyToken, checkRole(["Admin"]), usersController.getAllUsers);
router.get("/:userId", verifyToken, checkRole(["Admin"]), usersController.getUserById);

// =====================================================================================================
/*
// Create new user (Admin only)
router.post('/', verifyToken, checkRole(['Admin']), async (req, res) => {
  try {
    const { username, password, email, role, fullName, address, contactNumber } = req.body;

    if (!username || !password || !email || !role) {
      return res.status(400).json({ message: 'Username, password, email, and role are required' });
    }

    const validRoles = ['Customer', 'Staff', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      userId: users.length + 1,
      username,
      passwordHash,
      email,
      role,
      accountStatus: 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);

    if (role === 'Customer') {
      const newProfile = {
        customerId: customerProfiles.length + 1,
        userId: newUser.userId,
        fullName: fullName || username,
        address: address || '',
        contactNumber: contactNumber || ''
      };

      customerProfiles.push(newProfile);
    }

    auditLogs.push({
      auditId: auditLogs.length + 1,
      userId: req.user.userId,
      actionType: 'INSERT',
      targetTable: 'User',
      actionTimestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        userId: newUser.userId,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        accountStatus: newUser.accountStatus
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (Admin only)
router.put('/:userId', verifyToken, checkRole(['Admin']), (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { email, role, accountStatus } = req.body;

    const userIndex = users.findIndex(u => u.userId === userId);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) {
      const validRoles = ['Customer', 'Staff', 'Admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      users[userIndex].role = role;
    }

    if (accountStatus) {
      const validStatuses = ['Active', 'Inactive', 'Suspended'];
      if (!validStatuses.includes(accountStatus)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      users[userIndex].accountStatus = accountStatus;
    }

    if (email) {
      const existingEmail = users.find(u => u.email === email && u.userId !== userId);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      users[userIndex].email = email;
    }

    auditLogs.push({
      auditId: auditLogs.length + 1,
      userId: req.user.userId,
      actionType: 'UPDATE',
      targetTable: 'User',
      actionTimestamp: new Date().toISOString()
    });

    res.json({
      message: 'User updated successfully',
      user: {
        userId: users[userIndex].userId,
        username: users[userIndex].username,
        email: users[userIndex].email,
        role: users[userIndex].role,
        accountStatus: users[userIndex].accountStatus
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:userId', verifyToken, checkRole(['Admin']), (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const userIndex = users.findIndex(u => u.userId === userId);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const deletedUser = users.splice(userIndex, 1)[0];

    const profileIndex = customerProfiles.findIndex(p => p.userId === userId);
    if (profileIndex !== -1) {
      customerProfiles.splice(profileIndex, 1);
    }

    auditLogs.push({
      auditId: auditLogs.length + 1,
      userId: req.user.userId,
      actionType: 'DELETE',
      targetTable: 'User',
      actionTimestamp: new Date().toISOString()
    });

    res.json({
      message: 'User deleted successfully',
      user: {
        userId: deletedUser.userId,
        username: deletedUser.username,
        role: deletedUser.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get audit logs (Admin only)
router.get('/audit/logs', verifyToken, checkRole(['Admin']), (req, res) => {
  try {
    res.json({ auditLogs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

*/

module.exports = router;