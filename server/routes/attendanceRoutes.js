
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// Allow Super Admin, Admin and Attendance Officer
router.use(
  verifyToken,
  authorizeRoles("super_admin", "admin", "attendance_officer")
);

// GET attendance by date or date range
router.get("/", async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    let filter = {};

    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    } else {
      return res.status(400).json({
        message: "Provide a date or both startDate and endDate",
      });
    }

    const records = await Attendance.find(filter)
      .populate("student", "name rollNumber course email")
      .sort({ date: -1 });

    return res.status(200).json(records);
  } catch (error) {
    console.error("Fetch attendance error:", error);

    return res.status(500).json({
      message: "Failed to retrieve attendance",
    });
  }
});

// POST: Mark or update attendance
router.post("/mark", async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({
        message: "Student ID, date, and status are required",
      });
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Present or Absent",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, date },
      { $set: { status } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Attendance saved successfully",
      attendance,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      message: "Failed to save attendance",
    });
  }
});

module.exports = router;
