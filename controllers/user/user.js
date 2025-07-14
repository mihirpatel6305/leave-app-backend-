const leave = require("../../models/leave");
const User = require("../../models/users");
const bcrypt = require("bcryptjs");

// 📌 Create User
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, manager } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      manager,
      createdBy: req.user?._id,
      lastModifiedBy: req.user?._id,
    });

    const saved = await user.save();
    const { password: _, ...userWithoutPassword } = saved.toObject(); // remove password
    res.status(201).json({ status: "success", data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error creating user",
      error: error.message,
    });
  }
};

// 📌 Read All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No users available" });
    }

    res.status(200).json({
      status: "success",
      message: "all user fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// 📌 Read filter data Users
exports.filterUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const users = await User.find()
      .populate([
        { path: "createdBy", select: "name email" },
        { path: "lastModifiedBy", select: "name email" },
        { path: "manager", select: "name email" },
      ])
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select("-password");

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No users available" });
    }

    const totalusers = await User.countDocuments();
    const totalPages = Math.ceil(totalusers / limit);

    res.status(200).json({
      status: "success",
      totalusers,
      totalPages,
      currentPage: page,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// // 📌 Read User Under Manager
exports.getUsersByManager = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};

    if (req.params.id) {
      filter.manager = req.params.id;
    }

    const users = await User.find(filter)
      .populate([
        { path: "createdBy", select: "name email" },
        { path: "lastModifiedBy", select: "name email" },
        { path: "manager", select: "name email" },
      ])
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select("name email role createdBy lastModifiedBy");

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: "success",
        message: "No users available",
        data: users,
      });
    }

    const totalusers = users?.length;
    const totalPages = Math.ceil(totalusers / limit);

    res.status(200).json({
      status: "success",
      totalusers,
      totalPages,
      currentPage: page,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching users",
      error: error.message,
    });
  }
};

exports.getAllmanagers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["manager", "admin"] },
    }).select("-password");

    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No users available" });
    }

    res.status(200).json({
      status: "success",
      message: "all managers and admin fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// 📌 Read Single User by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ status: "success", data: user });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// 📌 Update User
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, role, manager } = req.body;

    const updateData = {
      name,
      email,
      role,
      manager,
      lastModifiedBy: req.user?._id,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json({ status: "success", data: updated });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error updating user",
      error: error.message,
    });
  }
};

// 📌 Delete User
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error deleting user",
      error: error.message,
    });
  }
};
