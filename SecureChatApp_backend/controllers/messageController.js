const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
  const { sender, receiver, content, isEncrypted } = req.body;

  try {
    const message = await Message.create({ sender, receiver, content, isEncrypted });
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Message send failed', details: err.message });
  }
};

exports.getMessages = async (req, res) => {
  const { senderId, receiverId } = req.query;

  try {
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Fetching messages failed' });
  }
};
