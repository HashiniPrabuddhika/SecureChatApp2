const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message_id: { type: String, required: true, unique: true },
    timestamp: { type: Number, required: true },
    encryptedMessage: String,
    iv: String
});
module.exports = mongoose.model('Message', MessageSchema);
