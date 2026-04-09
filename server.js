import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import Patient from "./models/Patient.js";
import Doctor from "./models/Doctor.js";
import Appointment from "./models/Appointment.js";
import User from "./models/User.js";
import { authenticateToken, authorizeRoles } from "./middleware/auth.js";

dotenv.config();

const app = express();
const allowedRoles = ["admin", "doctor", "patient"];
const emailPattern = /\S+@\S+\.\S+/;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

// =======================
// MongoDB Connection
// =======================
mongoose
  .connect("mongodb://127.0.0.1:27017/clinicianDB")
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log(err));

// =======================
// Test Route
// =======================
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// =======================
// AUTH ROUTES
// =======================

// Signup
app.post("/signup", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const requestedRole =
      typeof req.body.role === "string" ? req.body.role.trim().toLowerCase() : "";
    const role = allowedRoles.includes(requestedRole) ? requestedRole : "doctor";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to create account right now.",
    });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
});

// =======================
// PROTECTED ROUTE
// =======================
app.get("/profile", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Protected route",
    user: req.user,
  });
});

app.get(
  "/admin/users",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.json({
        success: true,
        data: users.map(sanitizeUser),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Unable to load admin user records right now.",
      });
    }
  }
);

// =======================
// PATIENT ROUTES (PROTECTED)
// =======================

// GET all patients
app.get("/patients", authenticateToken, authorizeRoles("doctor", "admin"), async (req, res) => {
  try {
    const data = await Patient.find();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ADD patient
app.post("/patients", authenticateToken, authorizeRoles("doctor", "admin"), async (req, res) => {
  try {
    const newPatient = await Patient.create(req.body);
    res.json({ success: true, data: newPatient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE patient
app.put("/patients/:id", authenticateToken, authorizeRoles("doctor", "admin"), async (req, res) => {
  try {
    const updated = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE patient
app.delete("/patients/:id", authenticateToken, authorizeRoles("doctor", "admin"), async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =======================
// SERVER START
// =======================
app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});
