const express = require("express");
const router = express.Router();
const userController = require("../../controllers/user/user");
const auth = require("../../middleware/auth");
const isManager = require("../../middleware/isManager");
const isAdmin = require("../../middleware/isAdmin");

// All routes protected by auth
router.use(auth);

router.post("/", isManager, userController.createUser);
router.get("/", isAdmin, userController.getAllUsers);
router.get("/filter", isAdmin, userController.filterUsers);
router.get(
  "/filter/by-manager/:id",
  isManager,
  userController.getUsersByManager
);
router.get("/managers", isManager, userController.getAllmanagers);
router.get("/:id", userController.getUserById);
router.put("/:id", isManager, userController.updateUser);
router.delete("/:id", isAdmin, userController.deleteUser);

module.exports = router;
