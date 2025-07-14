const LeaveHistory = require('../../models/leaveHistory');

// exports.createLeaveHistory = async (req,res) => {
//     try {
//         const { user, leave, action, message, oldStatus, newStatus } = req.body;

//         const savedHistory = await LeaveHistory.create({
//           user,
//           leave,
//           action,
//           message,
//           oldStatus,
//           newStatus,
//         });
//         return res
//           .status(201)
//           .json({
//             status: "success",
//             message: "Leave Histoy successfully created",
//             data:savedHistory,
//           });
//     } catch (error) {
//         return res.status(500).json({
//           status: "error",
//           message: "Something went wrong while creating leave history",
//           error,
//         });
//     }
// }



exports.createLeaveHistory = async ({
  user,
  leave,
  action,
  message,
  statusChange,
  change,
}) => {
  try {
    await LeaveHistory.create({
      user,
      leave,
      action,
      message,
      statusChange,
      change,
    });
  } catch (err) {
    console.error("Failed to create leave history", err);
  }
};


exports.getLeaveHistory = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leaveHis = await LeaveHistory.find({leave:leaveId}).populate([{path:'user',select:'name role'},{path:'leave',select:'reason'}]);
    if (!leaveHis)
      return res
        .status(404)
        .json({ status: "error", message: "leave Histroy not found" });
    res.json({ status: "success", data: leaveHis });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error fetching leave history" });
  }
};
