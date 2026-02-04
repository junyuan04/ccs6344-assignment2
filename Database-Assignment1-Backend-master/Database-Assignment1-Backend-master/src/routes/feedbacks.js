const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const ctrl = require("../controllers/feedbacksController");

// Customer: create + view own list
router.post("/", verifyToken, checkRole(["Customer"]), ctrl.create);
router.get("/my", verifyToken, checkRole(["Customer"]), ctrl.myList);

// Staff/Admin: list all + update status + reply
router.get("/", verifyToken, checkRole(["Staff", "Admin"]), ctrl.listAll);
router.put("/:id/status", verifyToken, checkRole(["Staff", "Admin"]), ctrl.updateStatus);
router.post("/:id/replies", verifyToken, checkRole(["Staff", "Admin"]), ctrl.reply);

// Both: view one (customer will perform an ownership check on the controller)
router.get("/:id", verifyToken, checkRole(["Customer", "Staff", "Admin"]), ctrl.getOne);

module.exports = router;
