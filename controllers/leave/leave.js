const Leave = require("../../models/leave");
const Users = require("../../models/users");
const sendEmail = require("../../utils/sendEmail");
const LeaveHistory = require("../leaveHistory/leaveHistory");
const { v2: cloudinary } = require("cloudinary");

const isweekend = (datestr) => {
  const date = new Date(datestr);
  const day = date.getDay(date);
  return day == 0 || day == 6;
};

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

//   Create Leave
exports.createLeave = async (req, res) => {
  try {
    const { dates, reason } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Dates must be a non-empty array",
      });
    }

    const currentDate = new Date();

    const hasPastDate = dates.some((d) => new Date(d) < currentDate);
    if (hasPastDate) {
      return res.status(400).json({
        status: "error",
        message: "You are sending previous dates",
      });
    }

    const alreadyAppliedDate = await Leave.find({
      user: req.user?._id,
      leaveDates: { $in: req.body?.dates },
      status: { $ne: "rejected" },
    });

    if (alreadyAppliedDate.length > 0) {
      if (req.file?.filename) {
        try {
          const isRaw =
            req.file.filename.endsWith(".pdf") ||
            req.file.filename.endsWith(".docx");
          const result = await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: isRaw ? "raw" : "image",
          });
          console.log("Cloudinary file deleted due to failure:", result);
        } catch (cloudErr) {
          console.error("Cloudinary cleanup failed:", cloudErr);
        }
      }
      return res.status(400).json({
        status: "error",
        message: "Already applied for This Dates",
        alreadyAppliedDate,
      });
    }

    const hasweekend = dates.some((d) => isweekend(d));

    if (hasweekend) {
      return res.status(400).json({
        status: "error",
        message: "Weekend dates are not allowed.",
      });
    }

    const leave = new Leave({
      user: req.user._id,
      leaveDates: dates,
      reason,
      attachmentUrl: req?.file ? req.file?.path : null,
      attachmentPublicId: req?.file ? req.file?.filename : null,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
    });

    const saved = await leave.save();

    await LeaveHistory.createLeaveHistory({
      user: req.user._id,
      leave: saved?._id,
      action: "CREATED",
      statusChange: "pending",
    });

    // For Mail

    if (req.user?.manager?.email) {
      await sendEmail({
        to: req.user?.manager?.email,
        subject: "New Leave Application Submitted",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #004aad; color: white; padding: 16px 24px;">
            <h2 style="margin: 0;">New Leave Application</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear <strong>${req.user.manager.name}</strong>,</p>
    
            <p><strong>${
              req.user.name
            }</strong> has submitted a new leave application. Below are the details:</p>
    
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  leave.reason
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Dates</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${leave.leaveDates
                  .map((d) => new Date(d).toDateString())
                  .join(", ")}</td>
              </tr>
            </table>
    
            <p style="margin-top: 24px;">
              Please log in to the system to review and take appropriate action.
            </p>
    
            <p style="margin-top: 32px;">Regards,<br><strong>Leave Management System</strong></p>
          </div>
        </div>
      `,
      });
    }

    res.status(201).json({ status: "success", data: saved });
  } catch (error) {
    console.error("Error in createLeave:", error);

    // Clean up uploaded file if available
    if (req.file?.filename) {
      try {
        const isRaw =
          req.file.filename.endsWith(".pdf") ||
          req.file.filename.endsWith(".docx");
        const result = await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: isRaw ? "raw" : "image",
        });
        console.log("Cloudinary file deleted due to failure:", result);
      } catch (cloudErr) {
        console.error("Cloudinary cleanup failed:", cloudErr);
      }
    }

    res.status(500).json({
      status: "error",
      message: "Error creating leave",
      error: error.message,
    });
  }
};

//   Read All Leaves (for current user)
exports.getMyLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page 1
    const limit = parseInt(req.query.limit) || 10; // default limit 10
    const skip = (page - 1) * limit;

    const sort = {};
    sort[req.query.sortField] = req.query.sortOrder === "asc" ? 1 : -1;

    const totalLeaves = (await Leave.find({ user: req.user._id }))?.length;
    const totalPages = Math.ceil(totalLeaves / limit);

    const leaves = await Leave.find({ user: req.user._id })
      .populate([
        { path: "user", select: "name email" },
        { path: "reviewedBy", select: "name email" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      status: "success",
      totalLeaves,
      totalPages,
      currentPage: page,
      data: leaves,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Error fetching leaves", error });
  }
};

//   Get all leaves with user info (admin only) - With Pagination
exports.getAllLeavesWithUsers = async (req, res) => {
  try {
    // Extract page and limit from query parameters
    const page = parseInt(req.query.page) || 1; // default page 1
    const limit = parseInt(req.query.limit) || 10; // default limit 10
    const skip = (page - 1) * limit;

    const sort = {};
    sort[req.query.sortField] = req.query.sortOrder === "asc" ? 1 : -1;

    // Get total count for frontend pagination info
    const totalLeaves = await Leave.countDocuments();
    const totalPages = Math.ceil(totalLeaves / limit);

    // Fetch paginated leaves with user info
    const leaves = await Leave.find()
      .populate([
        { path: "user", select: "name email" },
        { path: "reviewedBy", select: "name email" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      status: "success",
      totalLeaves,
      totalPages,
      currentPage: page,
      data: leaves,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Error fetching all leaves" });
  }
};

//   Get all leaves with user info (admin only) - With Pagination
exports.getTeamLeave = async (req, res) => {
  try {
    // Extract page and limit from query parameters
    const page = parseInt(req.query.page) || 1; // default page 1
    const limit = parseInt(req.query.limit) || 10; // default limit 10
    const skip = (page - 1) * limit;

    const managerId = req.params?.id;

    const sort = {};
    sort[req.query.sortField] = req.query.sortOrder === "asc" ? 1 : -1;

    const teamEmployees = await Users.find({ manager: managerId });
    const teamIds = teamEmployees.map((e) => e._id);

    // Fetch paginated leaves with user info
    const leaves = await Leave.find({ user: { $in: teamIds } })
      .populate([
        { path: "user", select: "name email" },
        { path: "reviewedBy", select: "name email" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalLeaves = (await Leave.find({ user: { $in: teamIds } }))?.length;

    res.json({
      status: "success",
      totalLeaves,
      totalPages: Math.ceil(totalLeaves / limit),
      currentPage: page,
      data: leaves,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Error fetching Team leaves", error });
  }
};

//   Read Single Leave by ID
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave)
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    res.json({ status: "success", data: leave });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error fetching leave" });
  }
};

//  Update Leave
exports.updateLeave = async (req, res) => {
  try {
    const { dates, reason } = req.body;

    // 1. Find the leave
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    }

    // 2. Only allow update if leave is pending
    if (leave.status === "approved") {
      return res.status(400).json({
        status: "error",
        message: "Leave is already Approved",
      });
    }

    // 3. Prevent updating with past dates
    const currentDate = new Date();
    const formattedDates = dates.map((d) => new Date(d));

    const hasPastDate = formattedDates.some((d) => new Date(d) < currentDate);
    if (hasPastDate) {
      return res.status(400).json({
        status: "error",
        message: "You are sending previous dates",
      });
    }

    // for leave change history
    const oldDates = leave.leaveDates.map((d) => new Date(d).getTime()).sort();
    const newDates = dates.map((d) => new Date(d).getTime()).sort();

    const isSameDates = JSON.stringify(oldDates) === JSON.stringify(newDates);

    const changes = {};

    if (leave.reason !== reason) {
      changes.reason = { from: leave.reason, to: reason };
    }

    if (req.file?.filename && req.file?.filename !== leave.attachmentUrl) {
      changes.attachmentUrl = {
        from: leave.attachmentUrl,
        to: req.file.filename,
      };
    }

    if (!isSameDates) {
      changes.dates = {
        from: leave.leaveDates,
        to: dates,
      };
    }

    // 4. Proceed with update
    leave.leaveDates = formattedDates;
    leave.reason = reason;
    leave.attachmentUrl = req.file ? req.file?.filename : leave.attachmentUrl;
    leave.status = "pending";
    leave.lastModifiedBy = req.user._id;

    const updated = await leave.save();

    await LeaveHistory.createLeaveHistory({
      user: req.user._id,
      leave: updated?._id,
      action: "UPDATED",
      change: changes || {},
      statusChange: "pending",
    });

    res.json({
      status: "success",
      message: "Leave updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating leave:", error);
    res
      .status(500)
      .json({ status: "error", message: "Error updating leave", error });
  }
};

//   Approve Leave
exports.approveLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const message = req.body?.message;

    const leave = await Leave.findById(leaveId).populate([
      { path: "user", select: "name email" },
      { path: "reviewedBy", select: "name email" },
    ]);
    if (!leave)
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });

    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ status: "error", message: `Leave already ${leave.status}` });
    }

    leave.status = "approved";
    leave.reviewedBy = req?.user?.id;

    const saved = await leave.save();
    await leave.populate("reviewedBy", "name email");
    await LeaveHistory.createLeaveHistory({
      user: req.user._id,
      leave: saved?._id,
      action: "APPROVED",
      message: message,
      statusChange: "approved",
    });

    await sendEmail({
      to: saved?.user?.email,
      subject: "Your Leave Has Been Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #28a745; color: white; padding: 16px 24px;">
            <h2 style="margin: 0;">Leave Approved</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear <strong>${leave?.user?.name}</strong>,</p>
    
            <p>We are pleased to inform you that your leave request has been <strong>approved</strong>.</p>
    
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  leave?.reason
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Dates</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${leave?.leaveDates
                  .map((date) => new Date(date).toDateString())
                  .join(", ")}</td>
              </tr>
            </table>
    
            <p style="margin-top: 24px;">
              If you have any questions, feel free to contact your manager or HR.
            </p>
    
            <p style="margin-top: 32px;">Best regards,<br><strong>${
              leave?.reviewedBy?.name
            }</strong></p>
          </div>
        </div>
      `,
    });

    res.status(200).json({
      status: "success",
      message: "Leave approved successfully",
      data: saved,
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Server Error", error: err.message });
  }
};

//   Rejected Leave
exports.rejectLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const message = req.body?.message;

    const leave = await Leave.findById(leaveId).populate("user", "email name");
    if (!leave)
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });

    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ status: "error", message: `Leave already ${leave.status}` });
    }

    leave.status = "rejected";
    leave.reviewedBy = req?.user?.id;
    const saved = await leave.save();
    await leave.populate("reviewedBy", "name email");

    await LeaveHistory.createLeaveHistory({
      user: req.user._id,
      leave: saved?._id,
      action: "REJECTED",
      message: message,
      statusChange: "rejected",
    });

    await sendEmail({
      to: leave?.user?.email,
      subject: "Your Leave Has Been Rejected",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #dc3545; color: white; padding: 16px 24px;">
            <h2 style="margin: 0;">Leave Request Rejected</h2>
          </div>
          <div style="padding: 24px;">
            <p>Dear <strong>${leave?.user?.name}</strong>,</p>
    
            <p>We regret to inform you that your leave request has been <strong>rejected</strong>.</p>
    
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${
                  leave?.reason
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Dates</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${leave?.leaveDates
                  .map((date) => new Date(date).toDateString())
                  .join(", ")}</td>
              </tr>
              ${
                message
                  ? `<tr>
                      <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reviewer’s Note</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
                    </tr>`
                  : ""
              }
            </table>
    
            <p style="margin-top: 24px;">
              If you have any concerns or need clarification, please contact your manager.
            </p>
    
            <p style="margin-top: 32px;">Best regards,<br><strong>${
              leave?.reviewedBy?.name
            }</strong></p>
          </div>
        </div>
      `,
    });

    res.status(200).json({
      status: "success",
      message: "Leave rejected successfully",
      leave,
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Server Error", error: err.message });
  }
};

//   Delete Leave
exports.deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    //  Check if leave exists
    if (!leave) {
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    }

    //  Prevent deletion if leave is Approved
    if (leave.status === "approved") {
      return res.status(400).json({
        status: "error",
        message: `A ${leave.status.toLowerCase()} leave can't be deleted`,
      });
    }

    if (leave.attachmentPublicId) {
      try {
        const isRaw =
          leave.attachmentPublicId.endsWith(".pdf") ||
          leave.attachmentPublicId.endsWith(".docx");

        const result = await cloudinary.uploader.destroy(
          leave.attachmentPublicId,
          {
            resource_type: isRaw ? "raw" : "image",
          }
        );
        console.log("Cloudinary deletion result:", result);
      } catch (err) {
        console.error("Error deleting file from Cloudinary:", err);
      }
    }

    //  Proceed with deletion
    const deleted = await Leave.deleteOne({ _id: leave._id });

    await LeaveHistory.createLeaveHistory({
      user: req.user._id,
      leave: leave?._id,
      action: "DELETED",
    });

    res.json({
      status: "success",
      message: "Leave deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({ status: "error", message: "Error deleting leave" });
  }
};
