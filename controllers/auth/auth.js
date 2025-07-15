const User = require("../../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 📌 Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const savedUser = await user.save();

    // Generate token
    const token = jwt.sign(
      { _id: savedUser._id, role: savedUser.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const { password: _, ...userData } = savedUser.toObject();
    res.status(201).json({ token, user: userData });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

// 📌 Login
exports.loginUser = async (req, res) => {
  try {
    
    console.log("LOGIN REQUEST:", req.body);
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    // Generate token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const { password: _, ...userData } = user.toObject();
    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// 📌 Get Current Logged-In User
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user", error: error.message });
  }
};
