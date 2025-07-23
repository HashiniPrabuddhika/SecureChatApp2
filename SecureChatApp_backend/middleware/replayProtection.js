const seenMessages = new Set();

function replayProtection(req, res, next) {
    const { message_id, timestamp } = req.body;

    if (!message_id || !timestamp) {
        return res.status(400).json({ error: 'Missing message_id or timestamp' });
    }

    if (seenMessages.has(message_id)) {
        return res.status(403).json({ error: 'Replay attack detected' });
    }

    seenMessages.add(message_id);
    setTimeout(() => seenMessages.delete(message_id), 300000);

    next();
}

module.exports = replayProtection;
