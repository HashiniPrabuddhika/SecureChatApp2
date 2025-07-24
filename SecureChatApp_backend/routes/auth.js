const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logAuthEvent = require("../logs/authLogger");
const { generateSalt, hashPassword } = require("../utils/passwordUtils");

// Signup Route
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: "Username, email, and password are required",
    });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const newUser = new User({ username, email, passwordHash, salt });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifier and password required" });
  }

  try {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      logAuthEvent("unknown", "Login Failure (user not found)", req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const inputHash = await hashPassword(password, user.salt);
    const isMatch = inputHash === user.passwordHash;

    if (!isMatch) {
      logAuthEvent(user._id, "Login Failure (incorrect password)", req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logAuthEvent(user._id, "Login Success", req.ip);
    res.status(200).json({
      token,
      email: user.email,
      username: user.username,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
