// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { body, validationResult } = require("express-validator");
const PendingRequest = require("../models/pendingRequest"); // PendingRequest model

// Child Registration Route
router.post(
  "/register",
  [
    body("username", "Username is required").not().isEmpty(),
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password is required").isLength({ min: 6 }),
    body("dob", "Date of birth is required")
      .if(body("role").equals("child"))
      .not()
      .isEmpty(), // Conditionally required
    body("parentPhoneNumber", "Parent phone number is required")
      .if(body("role").equals("child"))
      .not()
      .isEmpty(), // Conditionally required
    body("phoneNumber", "Phone number is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      username,
      email,
      password,
      dob,
      parentPhoneNumber,
      phoneNumber,
      role,
    } = req.body;

    try {
      // Check if the user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "User already exists" });
      }

      // Create a new user
      user = new User({
        username,
        email,
        password,
        dob,
        phoneNumber,
        role,
        parentPhoneNumber: role === "child" ? parentPhoneNumber : undefined,
      });

      // Hash password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      // if (role === "child") {
      //   // Find the parent by phone number
      //   const parent = await User.findOne({
      //     phoneNumber: parentPhoneNumber,
      //     role: "parent",
      //   });
      //   if (!parent) {
      //     return res.status(404).json({ msg: "Parent not found" });
      //   }

      //   // Create a pending request for the parent
      //   const request = new PendingRequest({
      //     childId: user._id,
      //     parentId: parent._id,
      //   });
      //   await request.save();
      // }

      // Generate JWT token for the user
      const payload = {
        user: {
          id: user._id,
        },
      };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            msg: "Registration successful, request sent to parent",
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post(
  "/register-parent",
  [
    body("username", "Username is required").not().isEmpty(),
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password is required").isLength({ min: 6 }),
    body("phoneNumber", "Phone number is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, phoneNumber } = req.body;

    try {
      // Check if parent user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "Parent already exists" });
      }

      // Create a new parent user
      user = new User({
        username,
        email,
        password,
        role: "parent",
        phoneNumber, // Make sure phoneNumber is saved
      });

      // Hash password before saving
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      // After registration, check for pending requests
      const pendingRequests = await PendingRequest.find({
        parentId: user._id,
        status: "pending",
      }).populate("childId", "username email");

      // Generate JWT token for the parent
      const payload = {
        user: {
          id: user._id,
        },
      };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
        (err, token) => {
          if (err) throw err;

          res.json({
            token,
            msg: "Parent registration successful",
            pendingRequests, // Show pending child requests if any
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// routes/auth.js (Login for Parent and Child - Universal Login)
router.post(
  "/login",
  [
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if the user (parent or child) exists
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      // Match the password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      // Create JWT payload
      const payload = {
        user: {
          id: user.id,
        },
      };

      // Sign token
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
