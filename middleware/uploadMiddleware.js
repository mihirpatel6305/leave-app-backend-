const { MulterError } = require("multer");
const upload = require("./multerConfig");
const multer = require("multer");

const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single("attachmentUrl");

  singleUpload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors (file too big, etc.)
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          status: "error",
          message: "File too large. Max 2MB allowed.",
        });
      }
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    } else if (err) {
      // Custom fileFilter or other unknown errors
      return res.status(400).json({
        status: "error",
        message: err.message || "File upload failed.",
      });
    }

    // If no file was uploaded, optionally reject
    // if (!req.file) {
    //   return res.status(400).json({
    //     status: "error",
    //     message: "No file uploaded.",
    //   });
    // }

    next();
  });
};
module.exports = uploadMiddleware;
