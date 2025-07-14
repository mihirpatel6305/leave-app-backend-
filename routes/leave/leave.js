const express = require("express");
const router = express.Router();
const leaveController = require("../../controllers/leave/leave");
const auth = require("../../middleware/auth");
const isAdmin = require("../../middleware/isAdmin");
const upload = require("../../middleware/multerConfig");
const uploadMiddleware = require("../../middleware/uploadMiddleware");
const isManager = require("../../middleware/isManager");

// All routes are protected (user must be logged in)
router.use(auth);

// 📌 CREATE: Apply for leave
router.post("/", uploadMiddleware, leaveController.createLeave);

// 📌 READ: Get all leaves of the logged-in user
router.get("/", leaveController.getMyLeaves);

// Get All Leave
router.get("/filter/all", isAdmin, leaveController.getAllLeavesWithUsers);

// Get Leave By Manager Id
router.get("/filter/teamLeave/:id", isManager, leaveController.getTeamLeave);

// 📌 READ: Get single leave by ID
router.get("/:id", leaveController.getLeaveById);

// 📌 UPDATE: Update leave by ID
router.put("/:id", uploadMiddleware, leaveController.updateLeave);

// 📌 UPDATE: Approve Leave
router.put("/:id/apporve", isManager, leaveController.approveLeave);

// 📌 UPDATE: Decline Leave
router.put("/:id/decline", isManager, leaveController.rejectLeave);

// 📌 DELETE: Delete leave by ID
router.delete("/:id", leaveController.deleteLeave);


module.exports = router;
