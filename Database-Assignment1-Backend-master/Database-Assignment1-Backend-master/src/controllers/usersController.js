const usersService = require("../services/usersService");

async function getAllUsers(req, res, next) {
    try {
        const users = await usersService.getAllUsers();
        res.json({ success: true, users });
    } catch (err) {
        next(err);
    }
}

async function getUserById(req, res, next) {
    try {
        const userId = parseInt(req.params.userId, 10);
        const user = await usersService.getUserById(userId);

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
}

module.exports = { getAllUsers, getUserById };