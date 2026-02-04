const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const adminsController = require("../controllers/adminsController");


// Only Admin can access admin routes
router.get("/", verifyToken, checkRole(["Admin"]), adminsController.getAll);
router.get("/:profileId", verifyToken, checkRole(["Admin"]), adminsController.getByProfileId);
router.post("/", verifyToken, checkRole(["Admin"]), adminsController.create);
router.put("/:profileId", verifyToken, checkRole(["Admin"]), adminsController.updateByProfileId);
router.delete("/:profileId", verifyToken, checkRole(["Admin"]), adminsController.removeByProfileId);

module.exports = router;
