// routes/parent.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const PendingRequest = require("../models/pendingRequest");
const User = require("../models/user");
const Notification = require("../models/notification");
const { Server } = require("socket.io");
const io = new Server(); // Initialize socket.io server instance

// routes/parent.js (Parent dashboard with notifications)
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Check if the user is a parent
    const parent = await User.findById(req.user.id);
    if (!parent || parent.role !== "parent") {
      return res.status(401).json({ msg: "Not authorized" });
    }

    console.log("Parent:", parent); // Log the parent

    // Find all children linked to the parent
    const linkedChildren = await User.find({ parentId: parent._id }).select(
      "username email dob emergencyContact"
    );
    console.log("Linked Children:", linkedChildren); // Log linked children

    // Find all unread notifications
    const notifications = await Notification.find({
      parentId: parent._id,
      isRead: false,
    });

    res.json({
      linkedChildren,
      notifications,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// routes/parent.js (Approving or Rejecting Child Requests)
router.post("/approve-request/:id", auth, async (req, res) => {
  const { decision } = req.body; // 'accept' or 'reject'

  try {
    let request = await PendingRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    const parentUser = await User.findById(req.user.id);
    if (parentUser.role !== "parent") {
      return res.status(401).json({ msg: "Not authorized" });
    }

    if (decision === "accept") {
      request.status = "accepted";
      const childUser = await User.findById(request.childId);
      childUser.parentId = parentUser._id;
      await childUser.save();

      // Create a notification for the child
      const childNotification = new Notification({
        parentId: parentUser._id,
        childId: childUser._id,
        message: `Your request to link with ${parentUser.username} has been accepted.`,
      });
      await childNotification.save();

      // Emit notification event for child
      io.to(childUser._id.toString()).emit("notification", {
        userId: childUser._id,
        notification: childNotification,
      });
    } else if (decision === "reject") {
      request.status = "rejected";
    } else {
      return res.status(400).json({ msg: "Invalid decision" });
    }

    await request.save();
    res.json({ msg: `Request has been ${request.status}` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// routes/parent.js (Retrieve notifications)
router.get("/notifications", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      parentId: req.user.id,
      isRead: false,
    })
      .populate("childId", "username")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// routes/parent.js (Mark notification as read)
router.post("/notifications/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.parentId.toString() !== req.user.id) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ msg: "Notification marked as read." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
