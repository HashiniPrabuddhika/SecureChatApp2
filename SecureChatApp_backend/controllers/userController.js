const User = require('../models/User');

/**
 * Get all users except the logged-in user
 */
exports.getOtherUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id; // coming from middleware
    const users = await User.find({ _id: { $ne: currentUserId } }).select('-password -token');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
