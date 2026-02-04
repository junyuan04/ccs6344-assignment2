const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const profilesController = require("../controllers/profilesController");

// Admin/Staff can read
router.get("/", verifyToken, checkRole(["Admin", "Staff"]), profilesController.getAll);
router.get("/:id", verifyToken, checkRole(["Admin", "Staff"]), profilesController.getById);

// Admin only can modify
router.post("/", verifyToken, checkRole(["Admin"]), profilesController.create);
router.put("/:id", verifyToken, checkRole(["Admin"]), profilesController.update);
router.delete("/:id", verifyToken, checkRole(["Admin"]), profilesController.remove);

module.exports = router;