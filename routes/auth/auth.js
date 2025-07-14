const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth/auth");
const authMiddleware = require("../../middleware/auth");

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.get("/me", authMiddleware, authController.getCurrentUser);

module.exports = router;
