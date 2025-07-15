require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const leaveRoutes = require("./routes/leave/leave");
const userRoutes = require("./routes/user/user");
const authRoutes = require("./routes/auth/auth");
const leavehistory = require("./routes/leaveHistory/leaveHistory");
const dotenv = require("dotenv");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8000;

// dotenv.config(); // Load environment variables

console.log("Mongo URI:", process.env.MONGO_URI);
connectDB();

app.use(
  cors({
    origin:process.env.CLIENT_URL,
    // origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("This is Home page");
});

app.use("/api/auth", authRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leavehistory", leavehistory);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
