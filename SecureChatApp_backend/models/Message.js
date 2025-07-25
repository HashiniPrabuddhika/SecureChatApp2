// const mongoose = require('mongoose');
// const MessageSchema = new mongoose.Schema({
//     sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     message_id: { type: String, required: true, unique: true },
//     timestamp: { type: Number, required: true },
//     encryptedMessage: String,
//     iv: String
// });
// module.exports = mongoose.model('Message', MessageSchema);

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    // Sender and recipient references
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true // Add index for faster queries
    },
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        index: true // Add index for faster queries
    },
    
    // Unique message identifier for replay protection
    message_id: { 
        type: String, 
        required: true, 
        unique: true,
        index: true // Add index for faster lookups
    },
    
    // Timestamp in milliseconds for precise ordering and replay protection
    timestamp: { 
        type: Number, 
        required: true,
        index: true // Add index for sorting by time
    },
    
    // Encrypted message content (AES encrypted)
    encryptedMessage: {
        type: String,
        required: false, // Make it optional instead of required
        sparse: true 
    },
    
    // Initialization vector for AES decryption (stored as nonce from client)
    iv: {
        type: String,
        required: true
    },
    
    // Message status tracking
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    
    // Optional: Message type for different kinds of content
    messageType: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        default: 'text'
    },
    
    // Optional: Digital signature for message verification
    signature: {
        type: String,
        required: false
    },
    
    // Optional: Metadata for message context
    metadata: {
        type: Map,
        of: String,
        default: new Map()
    },
    
    // Soft delete flag (for future implementation)
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    // When the message was deleted (if applicable)
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    // Add timestamps for creation and updates
    timestamps: true,
    
    // Optimize for queries
    collection: 'messages'
});

// Compound indexes for efficient queries
MessageSchema.index({ sender: 1, recipient: 1, timestamp: 1 });
MessageSchema.index({ recipient: 1, sender: 1, timestamp: 1 });
MessageSchema.index({ timestamp: -1 }); // For recent messages
MessageSchema.index({ message_id: 1 }, { unique: true });

// Static method to find conversation messages
MessageSchema.statics.findConversation = function(userId1, userId2, options = {}) {
    const { limit = 50, offset = 0, sortOrder = 1 } = options;
    
    return this.find({
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 }
        ],
        isDeleted: false
    })
    .populate('sender', 'username email')
    .populate('recipient', 'username email')
    .sort({ timestamp: sortOrder })
    .limit(limit)
    .skip(offset);
};

// Static method to find messages by user
MessageSchema.statics.findByUser = function(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return this.find({
        $or: [
            { sender: userId },
            { recipient: userId }
        ],
        isDeleted: false
    })
    .populate('sender', 'username email')
    .populate('recipient', 'username email')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset);
};

// Instance method to mark as delivered
MessageSchema.methods.markAsDelivered = function() {
    this.status = 'delivered';
    return this.save();
};

// Instance method to mark as read
MessageSchema.methods.markAsRead = function() {
    this.status = 'read';
    return this.save();
};

// Instance method to soft delete
MessageSchema.methods.softDelete = function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Pre-save middleware to ensure timestamp is set
MessageSchema.pre('save', function(next) {
    if (!this.timestamp) {
        this.timestamp = Date.now();
    }
    next();
});

// Virtual for formatted timestamp
MessageSchema.virtual('formattedTimestamp').get(function() {
    return new Date(this.timestamp).toISOString();
});

// Virtual for checking if message is recent (within last hour)
MessageSchema.virtual('isRecent').get(function() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.timestamp > oneHourAgo;
});

// Ensure virtuals are included in JSON output
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', MessageSchema);
