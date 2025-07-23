const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const replayProtection = require('../middleware/replayProtection');
const authenticateToken = require('../middleware/auth');
const { encryptMessage } = require('../utils/encryption');

router.post('/send', authenticateToken, replayProtection, async (req, res) => {
    const { recipientId, message, message_id, timestamp } = req.body;
    if (!recipientId || !message || !message_id || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const encrypted = encryptMessage(message);
    const newMessage = new Message({
        sender: req.user.id,
        recipient: recipientId,
        message_id,
        timestamp,
        encryptedMessage: encrypted.content,
        iv: encrypted.iv
    });

    await newMessage.save();
    res.status(200).json({ success: true, message: 'Message sent securely' });
});

module.exports = router;
