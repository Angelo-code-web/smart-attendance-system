
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
console.log("ADMIN ROUTES MODULE LOADED");

const Admin = require("../models/Admin");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Only Super Admin can access these routes
router.use(verifyToken, authorizeRoles("super_admin"));
router.use((req, res, next) => {
  console.log("ADMIN ROUTER REACHED:", req.method, req.originalUrl);
  next();
});

// GET all administrators
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json(admins);
  } catch (error) {
    console.error("Fetch admins error:", error);
    return res.status(500).json({
      message: "Failed to retrieve administrators",
    });
  }
});

// CREATE a new administrator
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    const allowedRoles = ["admin", "attendance_officer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Role must be admin or attendance_officer",
      });
    }

    const existingAdmin = await Admin.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingAdmin) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const admin = await Admin.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });

    const safeAdmin = await Admin.findById(admin._id).select("-password");

    return res.status(201).json({
      message: "Administrator created successfully",
      admin: safeAdmin,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      message: "Failed to create administrator",
    });
  }
});

// UPDATE administrator role
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid administrator ID",
      });
    }

    if (!["admin", "attendance_officer"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        message: "Super Admin role cannot be changed through this endpoint",
      });
    }

    admin.role = role;
    await admin.save();

    return res.status(200).json({
      message: "Administrator role updated successfully",
      admin: await Admin.findById(id).select("-password"),
    });
  } catch (error) {
    console.error("Update role error:", error);
    return res.status(500).json({
      message: "Failed to update administrator role",
    });
  }
});

// DELETE an administrator
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid administrator ID",
      });
    }

    if (id === req.admin.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Administrator not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        message: "Super Admin accounts cannot be deleted through this endpoint",
      });
    }

    await Admin.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Administrator deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({
      message: "Failed to delete administrator",
    });
  }
});

module.exports = router;
