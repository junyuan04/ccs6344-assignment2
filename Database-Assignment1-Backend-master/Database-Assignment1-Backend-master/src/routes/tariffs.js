const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const tariffsController = require("../controllers/tariffsController");

// all users can view tariffs after login (customer view only active)
router.get("/", verifyToken, tariffsController.getAll);
router.get("/:tariffId", verifyToken, tariffsController.getById);

// only staff and admins can create or update tariffs
router.post("/", verifyToken, checkRole(["Admin", "Staff"]), tariffsController.create);
router.put("/:tariffId", verifyToken, checkRole(["Admin", "Staff"]), tariffsController.update);

module.exports = router;
