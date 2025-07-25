// const seenMessages = new Set();

// function replayProtection(req, res, next) {
//     const { message_id, timestamp } = req.body;

//     if (!message_id || !timestamp) {
//         return res.status(400).json({ error: 'Missing message_id or timestamp' });
//     }

//     if (seenMessages.has(message_id)) {
//         return res.status(403).json({ error: 'Replay attack detected' });
//     }

//     seenMessages.add(message_id);
//     setTimeout(() => seenMessages.delete(message_id), 300000);

//     next();
// }

// module.exports = replayProtection;


// In-memory replay protection (consider using Redis in production)
const seenMessages = new Set();
const MESSAGE_EXPIRY_TIME = 300000; // 5 minutes in milliseconds

// Cleanup function to remove expired message IDs
const cleanupExpiredMessages = () => {
    // This is a simplified cleanup - in production, you'd want to track timestamps
    // For now, we'll rely on the setTimeout in the main function
    console.log(`🧹 Cleanup: Currently tracking ${seenMessages.size} message IDs`);
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredMessages, MESSAGE_EXPIRY_TIME);

function replayProtection(req, res, next) {
    const { message_id, timestamp } = req.body;

    console.log(`🔒 Replay protection check for message: ${message_id}`);

    if (!message_id || !timestamp) {
        console.log('❌ Replay protection failed: Missing message_id or timestamp');
        return res.status(400).json({ error: 'Missing message_id or timestamp' });
    }

    if (seenMessages.has(message_id)) {
        console.log(`🚫 Replay attack detected for message: ${message_id}`);
        return res.status(403).json({ error: 'Replay attack detected' });
    }

    // Check timestamp (5 minute window)
    const msgTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - msgTime);
    
    if (timeDiff > MESSAGE_EXPIRY_TIME) {
        console.log(`⏰ Message timestamp expired: ${timeDiff}ms difference (max: ${MESSAGE_EXPIRY_TIME}ms)`);
        return res.status(403).json({ error: 'Message timestamp expired' });
    }

    // Add to seen messages
    seenMessages.add(message_id);
    console.log(`✅ Message ${message_id} passed replay protection`);
    
    // Clean up after expiry time
    setTimeout(() => {
        seenMessages.delete(message_id);
        console.log(`🧹 Cleaned up expired message ID: ${message_id}`);
    }, MESSAGE_EXPIRY_TIME);

    next();
}

// Additional function for socket-based replay protection (used in socketHandler.js)
function socketReplayProtection(messageId, timestamp) {
    if (!messageId || !timestamp) {
        return { valid: false, error: 'Missing message_id or timestamp' };
    }

    if (seenMessages.has(messageId)) {
        return { valid: false, error: 'Replay attack detected' };
    }

    // Check timestamp (5 minute window)
    const msgTime = new Date(timestamp).getTime();
    if (Math.abs(Date.now() - msgTime) > MESSAGE_EXPIRY_TIME) {
        return { valid: false, error: 'Message timestamp expired' };
    }

    seenMessages.add(messageId);
    // Clean up after 5 minutes
    setTimeout(() => seenMessages.delete(messageId), MESSAGE_EXPIRY_TIME);

    return { valid: true };
}

// Export both functions
module.exports = replayProtection;
module.exports.socketReplayProtection = socketReplayProtection;
module.exports.MESSAGE_EXPIRY_TIME = MESSAGE_EXPIRY_TIME;