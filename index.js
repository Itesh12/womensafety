const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const serverless = require("serverless-http");

// Import routes and database connection
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const childRoutes = require("./routes/childRoutes"); // Assuming you have the child routes for requests
const parentRoutes = require("./routes/parentRoutes"); // Assuming you have the parents routes for requests

dotenv.config();

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server);

// Connect to the database
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/child", childRoutes); // Child routes for requests
app.use("/api/parent", parentRoutes); // Parents routes for requests

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected");

  // Handle new notifications
  socket.on("newNotification", (data) => {
    io.to(data.userId).emit("notification", data.notification);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Error handling for unknown routes
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = serverless(app);
