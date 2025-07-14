module.exports = function (req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return res
      .status(403)
      .json({ message: "Access denied. Admins and Managers only." });
  }
  next();
};
