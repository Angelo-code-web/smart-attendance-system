
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/Student");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// All routes require authentication
router.use(verifyToken);

// GET all students — all three roles
router.get(
  "/",
  authorizeRoles("super_admin", "admin", "attendance_officer"),
  async (req, res) => {
    try {
      const students = await Student.find().sort({ createdAt: -1 });

      return res.status(200).json(students);
    } catch (error) {
      console.error("Fetch error:", error);
      return res.status(500).json({
        message: "Failed to retrieve students",
      });
    }
  }
);

// POST a new student — Admin and Super Admin only
router.post(
  "/",
  authorizeRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const { name, rollNumber, course, email } = req.body;

      if (!name?.trim() || !rollNumber?.trim() || !course?.trim()) {
        return res.status(400).json({
          message: "Name, roll number, and course are required",
        });
      }

      const existingStudent = await Student.findOne({
        rollNumber: rollNumber.trim(),
      });

      if (existingStudent) {
        return res.status(409).json({
          message: "Roll number already exists",
        });
      }

      const student = await Student.create({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        course: course.trim(),
        email: email?.trim() || "",
      });

      return res.status(201).json({
        message: "Student added successfully",
        student,
      });
    } catch (error) {
      console.error("Add student error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "Roll number already exists",
        });
      }

      return res.status(500).json({
        message: "Failed to add student",
      });
    }
  }
);

// PUT update student — Admin and Super Admin only

// UPDATE a student — Admin and Super Admin only
router.put(
  "/:id",
  authorizeRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const { name, rollNumber, course, email } = req.body;

      if (!name?.trim() || !rollNumber?.trim() || !course?.trim()) {
        return res.status(400).json({
          message: "Name, roll number, and course are required",
        });
      }

      const existingStudent = await Student.findOne({
        rollNumber: rollNumber.trim(),
        _id: { $ne: req.params.id },
      });

      if (existingStudent) {
        return res.status(409).json({
          message: "Roll number already exists",
        });
      }

      const student = await Student.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          rollNumber: rollNumber.trim(),
          course: course.trim(),
          email: email?.trim() || "",
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      return res.status(200).json({
        message: "Student updated successfully",
        student,
      });
    } catch (error) {
      console.error("Update student error:", error);
      return res.status(500).json({
        message: "Failed to update student",
      });
    }
  }
);


// DELETE a student — Super Admin only
router.delete(
  "/:id",
  authorizeRoles("super_admin"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid student ID",
        });
      }

      const student = await Student.findByIdAndDelete(req.params.id);

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      return res.status(200).json({
        message: "Student deleted successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);

      return res.status(500).json({
        message: "Failed to delete student",
      });
    }
  }
);

module.exports = router;
