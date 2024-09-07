const mongoose = require("mongoose");

const ParentSchema = new mongoose.Schema({
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
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ], // Array of child user IDs
});

module.exports = Parent = mongoose.model("Parent", ParentSchema);
