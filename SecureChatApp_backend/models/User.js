// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//     username: { type: String, required: true, unique: true },
//     email:    { type: String, required: true, unique: true },
//     password: { type: String, required: true }
// });

// module.exports = mongoose.model('User', UserSchema);

// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  passwordHash: String,
  salt: String,
});

module.exports = mongoose.model("User", userSchema);


