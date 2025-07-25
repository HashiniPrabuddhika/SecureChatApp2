// const express = require('express');
// const router = express.Router();
// const Message = require('../models/Message');
// const replayProtection = require('../middleware/replayProtection');
// const authenticateToken = require('../middleware/auth');
// const { encryptMessage } = require('../utils/encryption');

// router.post('/send', authenticateToken, replayProtection, async (req, res) => {
//     const { recipientId, message, message_id, timestamp } = req.body;
//     if (!recipientId || !message || !message_id || !timestamp) {
//         return res.status(400).json({ error: 'Missing required fields' });
//     }

//     const encrypted = encryptMessage(message);
//     const newMessage = new Message({
//         sender: req.user.id,
//         recipient: recipientId,
//         message_id,
//         timestamp,
//         encryptedMessage: encrypted.content,
//         iv: encrypted.iv
//     });

//     await newMessage.save();
//     res.status(200).json({ success: true, message: 'Message sent securely' });
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const replayProtection = require('../middleware/replayProtection');
const authenticateToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Send message route (for REST API - optional since you're using sockets)
// In the POST '/send' route:
router.post('/send', authenticateToken, replayProtection, async (req, res) => {
    try {
        const { recipientId, encryptedMessage, encryptedAESKey, message_id, timestamp, nonce, signature } = req.body;
        
        if (!recipientId || !encryptedMessage || !message_id || !timestamp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate message ID if not provided
        const finalMessageId = message_id || uuidv4();
        
        // Ensure nonce is provided or generate one
        const finalNonce = nonce || require('crypto').randomBytes(16).toString('hex');

        const newMessage = new Message({
            sender: req.user.id,
            recipient: recipientId,
            message_id: finalMessageId,
            timestamp: new Date(timestamp).getTime(),
            encryptedMessage: encryptedMessage,
            iv: finalNonce // Use finalNonce instead of nonce
        });

        await newMessage.save();
        console.log(`💾 Message saved to database with ID: ${finalMessageId}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Message sent securely',
            messageId: finalMessageId
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000 && error.keyPattern?.nonce) {
            console.error('❌ Duplicate nonce detected in REST API');
            return res.status(409).json({ error: 'Duplicate message nonce' });
        }
        
        console.error('❌ Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Get message history route
router.get('/history/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        console.log(`📚 Message history requested by ${req.user.id} for chat with: ${otherUserId}`);
        
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, recipient: otherUserId },
                { sender: otherUserId, recipient: req.user.id }
            ]
        })
        .populate('sender', 'username email')
        .populate('recipient', 'username email')
        .sort({ timestamp: 1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

        const messageHistory = messages.map(msg => ({
            messageId: msg.message_id,
            from: msg.sender._id.toString(),
            fromUsername: msg.sender.username,
            to: msg.recipient._id.toString(),
            toUsername: msg.recipient.username,
            encryptedMessage: msg.encryptedMessage,
            iv: msg.iv,
            timestamp: new Date(msg.timestamp).toISOString(),
            sent: msg.sender._id.toString() === req.user.id
        }));

        res.json({ 
            otherUserId, 
            messages: messageHistory,
            hasMore: messages.length === parseInt(limit)
        });
        
        console.log(`📤 Sent ${messageHistory.length} messages via REST API`);
        
    } catch (error) {
        console.error('❌ Error fetching message history:', error);
        res.status(500).json({ error: 'Failed to fetch message history' });
    }
});

// Delete message route
router.delete('/:messageId', authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        
        const message = await Message.findOne({
            message_id: messageId,
            sender: req.user.id
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        await Message.deleteOne({ message_id: messageId });
        console.log(`🗑️ Message deleted: ${messageId}`);
        
        res.json({ success: true, message: 'Message deleted successfully' });
        
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;