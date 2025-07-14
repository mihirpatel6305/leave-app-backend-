const express = require("express");
const router = express.Router();
const leaveHistoryController = require("../../controllers/leaveHistory/leaveHistory");

router.get("/:id", leaveHistoryController.getLeaveHistory);

module.exports = router;