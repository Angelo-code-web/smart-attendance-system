
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.originalUrl);
  next();
});
// API Routes
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admins", (req, res, next) => {
  console.log("ADMIN MOUNT REACHED:", req.method, req.originalUrl);
  next();
}, adminRoutes);

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Smart Attendance System API is running",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

// Start server
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log("MongoDB connected successfully");
    console.log("Connected database:", mongoose.connection.name);
    console.log("Admin count:", await require("./models/Admin").countDocuments());
    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Connection error:", error.message);
    process.exit(1);
  }
}

startServer();
