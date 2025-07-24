const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message_id: { type: String, required: true, unique: true },
  timestamp: { type: Number, required: true },
  encryptedMessage: { type: String, required: true },
  iv: { type: String, required: true },
  hmac: { type: String, required: true },
  nonce: { type: String, required: true, unique: true }
});
module.exports = mongoose.model('Message', MessageSchema);
