// utils/passwordUtils.js
const crypto = require("crypto");

const generateSalt = () => crypto.randomBytes(16).toString("hex");

const hashPassword = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });

module.exports = { generateSalt, hashPassword };
