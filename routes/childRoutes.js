// routes/child.js

const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware"); // middleware for authentication
const User = require("../models/user"); // User model
const PendingRequest = require("../models/pendingRequest"); // PendingRequest model
const Notification = require("../models/notification"); // Notification model
// Add this line at the top of the file
const { Server } = require("socket.io");
const io = new Server(); // Initialize socket.io server instance

// Route to get notifications for a child
router.get("/notifications", auth, async (req, res) => {
  try {
    // Find notifications for the logged-in user
    const notifications = await Notification.find({ userId: req.user.id }).sort(
      { createdAt: -1 }
    );

    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Route to mark notification as read
router.patch("/notifications/:id", auth, async (req, res) => {
  try {
    // Find the notification by ID
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Ensure the notification belongs to the logged-in user
    if (!notification.userId.equals(req.user.id)) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Mark the notification as read
    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Modify the existing route to emit notifications
router.post("/request-parent", auth, async (req, res) => {
  const { parentPhoneNumber } = req.body;

  try {
    // Find the parent by phone number and role
    const parent = await User.findOne({
      phoneNumber: parentPhoneNumber,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({ msg: "Parent not found" });
    }

    // Get the child making the request
    const child = await User.findById(req.user.id);

    // Check if a pending request already exists
    const existingRequest = await PendingRequest.findOne({
      parentId: parent._id,
      childId: child._id,
    });

    if (existingRequest) {
      return res.status(400).json({ msg: "Request already sent." });
    }

    // Create a new pending request
    const newRequest = new PendingRequest({
      parentId: parent._id,
      childId: child._id,
      status: "pending",
    });
    await newRequest.save();

    // Create a notification for the parent
    const notification = new Notification({
      parentId: parent._id,
      childId: child._id,
      message: `${child.username} has requested to link with you.`,
    });
    await notification.save();

    // Emit notification event
    io.to(parent._id.toString()).emit("notification", {
      userId: parent._id,
      notification,
    });

    res.json({ msg: "Request sent and notification created." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
