const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const customersController = require("../controllers/customersController");

// Middleware to allow access to Admin/Staff or the customer themselves
function allowSelfOr(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // If trying to access /me, automatically set the ID to the logged-in user
    if (req.params.profileId === "me") {
      req.params.profileId = req.user.userId;
    }

    const pid = parseInt(req.params.profileId, 10);

    if (roles.includes(req.user.role)) return next();
    if (req.user.role === "Customer" && req.user.userId === pid) return next();

    return res
      .status(403)
      .json({ message: "Access denied. Insufficient permissions." });
  };
}

router.get("/me", verifyToken, (req, res, next) => {
    req.params.profileId = req.user.userId;
    next();
}, customersController.getByProfileId);

router.put("/me", verifyToken, (req, res, next) => {
    req.params.profileId = req.user.userId;
    next();
}, customersController.updateByProfileId);


// list (Admin/Staff)
router.get(
  "/",
  verifyToken,
  checkRole(["Admin", "Staff"]),
  customersController.getAll
);

// view single (Admin/Staff or self)
router.get(
  "/:profileId",
  verifyToken,
  allowSelfOr(["Admin", "Staff"]),
  customersController.getByProfileId
);

// create customer account+profile (Admin)
router.post("/", verifyToken, checkRole(["Admin"]), customersController.create);

// update (Admin/Staff or self)
router.put(
  "/:profileId",
  verifyToken,
  allowSelfOr(["Admin", "Staff"]),
  customersController.updateByProfileId
);

// delete (Admin only) -> delete Profile (cascade)
router.delete(
  "/:profileId",
  verifyToken,
  checkRole(["Admin"]),
  customersController.removeByProfileId
);

module.exports = router;
