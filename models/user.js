// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: false,
  },
  role: {
    type: String,
    enum: ["child", "parent"],
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  parentPhoneNumber: {
    type: String,
    required: function () {
      return this.role === "child";
    },
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // required: function () {
    //   return this.role === "child";
    // },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
