const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const staffsController = require("../controllers/staffsController");

function allowSelfOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  if (req.user.role === "Admin") return next();

  const pid = parseInt(req.params.profileId, 10);
  if (req.user.role === "Staff" && req.user.userId === pid) return next();

  return res.status(403).json({ message: "Access denied. Insufficient permissions." });
}

// Admin only list
router.get("/", verifyToken, checkRole(["Admin"]), staffsController.getAll);

// Admin or self staff
router.get("/:profileId", verifyToken, allowSelfOrAdmin, staffsController.getByProfileId);

// Admin only create staff account
router.post("/", verifyToken, checkRole(["Admin"]), staffsController.create);

// Admin or self staff update
router.put("/:profileId", verifyToken, allowSelfOrAdmin, staffsController.updateByProfileId);

// Admin only delete staff account (delete profile -> cascade)
router.delete("/:profileId", verifyToken, checkRole(["Admin"]), staffsController.removeByProfileId);

module.exports = router;
