const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const billsController = require("../controllers/billsController");

// Staff/Admin: list all
router.get("/", verifyToken, checkRole(["Admin", "Staff"]), billsController.getAll);

// Customer: my bills
router.get("/my", verifyToken, checkRole(["Customer"]), billsController.getMy);

// Customer/Staff/Admin: get single (customer will perform an ownership check on the controller)
router.get("/:billId", verifyToken, billsController.getById);

// Staff/Admin: create & update
router.post("/", verifyToken, checkRole(["Admin", "Staff"]), billsController.create);
router.put("/:billId", verifyToken, checkRole(["Admin", "Staff"]), billsController.update);

module.exports = router;
