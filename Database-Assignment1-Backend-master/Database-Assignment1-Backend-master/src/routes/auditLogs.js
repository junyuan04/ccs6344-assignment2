const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const auditLogsController = require("../controllers/auditLogsController");

// Admin only
router.get("/", verifyToken, checkRole(["Admin"]), auditLogsController.listAuditLogs);
router.get("/:id", verifyToken, checkRole(["Admin"]), auditLogsController.getAuditLog);

module.exports = router;