// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const connectedUsers = {}; // socket.id -> user info
// const JWT_SECRET = process.env.JWT_SECRET;

// module.exports = (io) => {
//   console.log('🚀 Socket.IO server initialized');

//   io.on('connection', (socket) => {
//     console.log(`📱 New connection attempt from socket: ${socket.id}`);
    
//     const token = socket.handshake.auth.token;

//     if (!token) {
//       console.log('❌ No token provided for socket:', socket.id);
//       socket.emit('error', 'No authentication token provided');
//       socket.disconnect();
//       return;
//     }

//     console.log(`🔐 Token received from socket ${socket.id}, verifying...`);

//     (async () => {
//       try {
//         // Decode and verify JWT
//         const decoded = jwt.verify(token, JWT_SECRET);
//         console.log(`✅ Token verified for socket ${socket.id}`);
//         console.log('🔍 Decoded token payload:', decoded);
        
//         // FIXED: Handle both 'id' and 'userId' field names
//         const userId = decoded.userId || decoded.id || decoded.sub;
        
//         console.log(`👤 Extracted user ID: ${userId}`);
        
//         if (!userId) {
//           console.log(`❌ No userId found in token for socket: ${socket.id}`);
//           console.log('Token payload:', JSON.stringify(decoded, null, 2));
//           socket.emit('error', 'Invalid token: no user ID found');
//           socket.disconnect();
//           return;
//         }

//         console.log(`🔍 Looking up user ${userId} in database...`);
//         const user = await User.findById(userId);

//         if (!user) {
//           console.log(`❌ User ${userId} not found in database for socket: ${socket.id}`);
//           socket.emit('error', `User not found in database. User ID: ${userId}`);
//           socket.disconnect();
//           return;
//         }

//         // User found successfully
//         connectedUsers[socket.id] = {
//           userId: user._id.toString(),
//           username: user.username,
//           email: user.email,
//           socketId: socket.id,
//           hasPublicKey: false,
//           connectedAt: new Date().toISOString()
//         };

//         console.log(`✅ ${user.username} (${user.email}) connected with socket ID ${socket.id}`);
//         console.log(`📊 Total connected users: ${Object.keys(connectedUsers).length}`);

//         // Emit updated user list to all clients
//         const userList = Object.values(connectedUsers);
//         console.log('📡 Broadcasting online users list:', userList.map(u => u.username));
//         io.emit('online-users', userList);

//         // Handle public key upload
//         socket.on('upload-public-key', ({ publicKey, keyType }) => {
//           console.log(`🔑 Public key uploaded by ${user.username} (type: ${keyType})`);
//           if (connectedUsers[socket.id]) {
//             connectedUsers[socket.id].hasPublicKey = true;
//             connectedUsers[socket.id].publicKey = publicKey;
//             connectedUsers[socket.id].keyType = keyType;
            
//             // Notify all clients about key availability
//             io.emit('user-key-available', connectedUsers[socket.id]);
//             console.log(`📢 Key availability broadcasted for ${user.username}`);
//           }
//         });

//         // Handle public key requests
//         socket.on('request-public-key', (targetUserId) => {
//           console.log(`🔑 Public key requested for user: ${targetUserId}`);
//           const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
//           if (target?.hasPublicKey) {
//             socket.emit('receive-public-key', target);
//             console.log(`✅ Public key sent to ${user.username} for user ${target.username}`);
//           } else {
//             console.log(`❌ Public key not available for user: ${targetUserId}`);
//           }
//         });

//         // Handle online users list requests
//         socket.on('get-online-users', () => {
//           const userList = Object.values(connectedUsers);
//           socket.emit('online-users', userList);
//           console.log(`📋 Online users list sent to ${user.username}: ${userList.length} users`);
//         });

//         // 🔐 Handle connection requests
//         socket.on('connection-request', (targetUserId) => {
//           console.log(`🤝 Connection request from ${user.username} to user: ${targetUserId}`);
//           const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
//           const requester = connectedUsers[socket.id];
          
//           if (target && requester) {
//             console.log(`📤 Sending connection request to ${target.username}`);
//             io.to(target.socketId).emit('connection-request-received', {
//               userId: requester.userId,
//               username: requester.username,
//               email: requester.email
//             });
//             console.log(`✅ Connection request delivered from ${requester.username} to ${target.username}`);
//           } else {
//             console.log(`❌ Target user not found or not online: ${targetUserId}`);
//             socket.emit('error', 'Target user not found or not online');
//           }
//         });

//         // ✅ Handle connection acceptance
//         socket.on('connection-request-accept', (fromUserId) => {
//           console.log(`✅ Connection request accepted by ${user.username} from user: ${fromUserId}`);
//           const requester = Object.values(connectedUsers).find(u => u.userId === fromUserId);
//           const accepter = connectedUsers[socket.id];
          
//           if (requester && accepter) {
//             console.log(`📤 Notifying ${requester.username} that connection was accepted`);
//             io.to(requester.socketId).emit('connection-request-accepted', {
//               fromUserId: accepter.userId,
//               fromUsername: accepter.username
//             });
//             console.log(`✅ Connection established between ${accepter.username} and ${requester.username}`);
//           } else {
//             console.log(`❌ Requester not found: ${fromUserId}`);
//           }
//         });

//         // ❌ Handle connection denial
//         socket.on('connection-request-deny', (fromUserId) => {
//           console.log(`❌ Connection request denied by ${user.username} from user: ${fromUserId}`);
//           const requester = Object.values(connectedUsers).find(u => u.userId === fromUserId);
//           const denier = connectedUsers[socket.id];
          
//           if (requester && denier) {
//             console.log(`📤 Notifying ${requester.username} that connection was denied`);
//             io.to(requester.socketId).emit('connection-request-denied', {
//               fromUserId: denier.userId,
//               fromUsername: denier.username
//             });
//             console.log(`❌ Connection denied between ${denier.username} and ${requester.username}`);
//           } else {
//             console.log(`❌ Requester not found: ${fromUserId}`);
//           }
//         });

//         // 💬 Handle message sending
//         socket.on('send-message', (data) => {
//           const { targetUserId } = data;
//           console.log(`💬 Message from ${user.username} to user: ${targetUserId}`);
          
//           const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
//           const sender = connectedUsers[socket.id];
          
//           if (target && sender) {
//             const messageData = {
//               ...data,
//               from: sender.userId,
//               fromUsername: sender.username
//             };
            
//             io.to(target.socketId).emit('receive-message', messageData);
//             console.log(`✅ Message delivered from ${sender.username} to ${target.username}`);
//           } else {
//             console.log(`❌ Message delivery failed - target user not found: ${targetUserId}`);
//             socket.emit('error', 'Message delivery failed - recipient not online');
//           }
//         });

//         // Handle disconnection
//         socket.on('disconnect', (reason) => {
//           const user = connectedUsers[socket.id];
//           if (user) {
//             console.log(`❌ ${user.username} disconnected (${reason})`);
//             delete connectedUsers[socket.id];
            
//             // Broadcast updated user list
//             const userList = Object.values(connectedUsers);
//             io.emit('online-users', userList);
//             console.log(`📊 Updated connected users count: ${userList.length}`);
//           } else {
//             console.log(`❌ Unknown socket disconnected: ${socket.id}`);
//           }
//         });

//         // Handle generic errors
//         socket.on('error', (error) => {
//           console.error(`🚨 Socket error from ${user.username}:`, error);
//         });

//         console.log(`🎉 All event handlers set up for ${user.username}`);

//       } catch (err) {
//         console.error('🚨 Socket auth error:', err.message);
//         console.error('🔍 Full error:', err);
        
//         let errorMessage = 'Authentication failed';
//         if (err.name === 'JsonWebTokenError') {
//           errorMessage = 'Invalid authentication token';
//         } else if (err.name === 'TokenExpiredError') {
//           errorMessage = 'Authentication token expired';
//         } else if (err.name === 'CastError') {
//           errorMessage = 'Invalid user ID format in token';
//         }
        
//         socket.emit('error', `${errorMessage}: ${err.message}`);
//         socket.disconnect();
//       }
//     })();
//   });

//   // Handle server-level errors
//   io.on('error', (error) => {
//     console.error('🚨 Socket.IO server error:', error);
//   });

//   console.log('✅ Socket.IO event handlers configured');
// };


const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message'); // Add Message model
const { v4: uuidv4 } = require('uuid'); // For generating unique message IDs
const connectedUsers = {}; // socket.id -> user info
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory replay protection (you might want to use Redis in production)
const seenMessages = new Set();

// Replay protection middleware for socket messages
function replayProtection(messageId, timestamp) {
  if (!messageId || !timestamp) {
    return { valid: false, error: 'Missing message_id or timestamp' };
  }

  if (seenMessages.has(messageId)) {
    return { valid: false, error: 'Replay attack detected' };
  }

  // Check timestamp (5 minute window)
  const msgTime = new Date(timestamp).getTime();
  if (Math.abs(Date.now() - msgTime) > 300000) {
    return { valid: false, error: 'Message timestamp expired' };
  }

  seenMessages.add(messageId);
  // Clean up after 5 minutes
  setTimeout(() => seenMessages.delete(messageId), 300000);

  return { valid: true };
}

module.exports = (io) => {
  console.log('🚀 Socket.IO server initialized');

  io.on('connection', (socket) => {
    console.log(`📱 New connection attempt from socket: ${socket.id}`);
    
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('❌ No token provided for socket:', socket.id);
      socket.emit('error', 'No authentication token provided');
      socket.disconnect();
      return;
    }

    console.log(`🔐 Token received from socket ${socket.id}, verifying...`);

    (async () => {
      try {
        // Decode and verify JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`✅ Token verified for socket ${socket.id}`);
        console.log('🔍 Decoded token payload:', decoded);
        
        // FIXED: Handle both 'id' and 'userId' field names
        const userId = decoded.userId || decoded.id || decoded.sub;
        
        console.log(`👤 Extracted user ID: ${userId}`);
        
        if (!userId) {
          console.log(`❌ No userId found in token for socket: ${socket.id}`);
          console.log('Token payload:', JSON.stringify(decoded, null, 2));
          socket.emit('error', 'Invalid token: no user ID found');
          socket.disconnect();
          return;
        }

        console.log(`🔍 Looking up user ${userId} in database...`);
        const user = await User.findById(userId);

        if (!user) {
          console.log(`❌ User ${userId} not found in database for socket: ${socket.id}`);
          socket.emit('error', `User not found in database. User ID: ${userId}`);
          socket.disconnect();
          return;
        }

        // User found successfully
        connectedUsers[socket.id] = {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          socketId: socket.id,
          hasPublicKey: false,
          connectedAt: new Date().toISOString()
        };

        console.log(`✅ ${user.username} (${user.email}) connected with socket ID ${socket.id}`);
        console.log(`📊 Total connected users: ${Object.keys(connectedUsers).length}`);

        // Emit updated user list to all clients
        const userList = Object.values(connectedUsers);
        console.log('📡 Broadcasting online users list:', userList.map(u => u.username));
        io.emit('online-users', userList);

        // Handle public key upload
        socket.on('upload-public-key', ({ publicKey, keyType }) => {
          console.log(`🔑 Public key uploaded by ${user.username} (type: ${keyType})`);
          if (connectedUsers[socket.id]) {
            connectedUsers[socket.id].hasPublicKey = true;
            connectedUsers[socket.id].publicKey = publicKey;
            connectedUsers[socket.id].keyType = keyType;
            
            // Notify all clients about key availability
            io.emit('user-key-available', connectedUsers[socket.id]);
            console.log(`📢 Key availability broadcasted for ${user.username}`);
          }
        });

        // Handle public key requests
        socket.on('request-public-key', (targetUserId) => {
          console.log(`🔑 Public key requested for user: ${targetUserId}`);
          const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
          if (target?.hasPublicKey) {
            socket.emit('receive-public-key', target);
            console.log(`✅ Public key sent to ${user.username} for user ${target.username}`);
          } else {
            console.log(`❌ Public key not available for user: ${targetUserId}`);
          }
        });

        // Handle online users list requests
        socket.on('get-online-users', () => {
          const userList = Object.values(connectedUsers);
          socket.emit('online-users', userList);
          console.log(`📋 Online users list sent to ${user.username}: ${userList.length} users`);
        });

        // 🔐 Handle connection requests (updated to include public key)
        socket.on('connection-request', (targetUserId, senderPublicKey) => {
          console.log(`🤝 Connection request from ${user.username} to user: ${targetUserId}`);
          const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
          const requester = connectedUsers[socket.id];
          
          if (target && requester) {
            console.log(`📤 Sending connection request to ${target.username}`);
            io.to(target.socketId).emit('connection-request-received', {
              userId: requester.userId,
              username: requester.username,
              email: requester.email,
              publicKey: senderPublicKey // Include sender's public key
            });
            console.log(`✅ Connection request delivered from ${requester.username} to ${target.username}`);
          } else {
            console.log(`❌ Target user not found or not online: ${targetUserId}`);
            socket.emit('error', 'Target user not found or not online');
          }
        });

        // ✅ Handle connection acceptance (updated to include public key)
        socket.on('connection-request-accept', (fromUserId, accepterPublicKey) => {
          console.log(`✅ Connection request accepted by ${user.username} from user: ${fromUserId}`);
          const requester = Object.values(connectedUsers).find(u => u.userId === fromUserId);
          const accepter = connectedUsers[socket.id];
          
          if (requester && accepter) {
            console.log(`📤 Notifying ${requester.username} that connection was accepted`);
            io.to(requester.socketId).emit('connection-request-accepted', {
              fromUserId: accepter.userId,
              fromUsername: accepter.username,
              publicKey: accepterPublicKey // Include accepter's public key
            });
            console.log(`✅ Connection established between ${accepter.username} and ${requester.username}`);
          } else {
            console.log(`❌ Requester not found: ${fromUserId}`);
          }
        });

        // ❌ Handle connection denial
        socket.on('connection-request-deny', (fromUserId) => {
          console.log(`❌ Connection request denied by ${user.username} from user: ${fromUserId}`);
          const requester = Object.values(connectedUsers).find(u => u.userId === fromUserId);
          const denier = connectedUsers[socket.id];
          
          if (requester && denier) {
            console.log(`📤 Notifying ${requester.username} that connection was denied`);
            io.to(requester.socketId).emit('connection-request-denied', {
              fromUserId: denier.userId,
              fromUsername: denier.username
            });
            console.log(`❌ Connection denied between ${denier.username} and ${requester.username}`);
          } else {
            console.log(`❌ Requester not found: ${fromUserId}`);
          }
        });

        // 💬 Handle message sending (updated with database storage and replay protection)
        socket.on('send-message', async (data) => {
              try {
                const { targetUserId, encryptedMessage, encryptedAESKey, timestamp, nonce, signature, messageId } = data;
                
                // Generate message ID if not provided
                const finalMessageId = messageId || uuidv4();
                
                // Ensure nonce is provided or generate one
                const finalNonce = nonce || require('crypto').randomBytes(16).toString('hex');
                
                // Apply replay protection
                const replayCheck = replayProtection(finalMessageId, timestamp);
                if (!replayCheck.valid) {
                  console.log(`🚫 Replay protection failed: ${replayCheck.error}`);
                  socket.emit('message-error', { error: replayCheck.error, messageId: finalMessageId });
                  return;
                }
            
            const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
            const sender = connectedUsers[socket.id];
            
            if (!target || !sender) {
              console.log(`❌ Message delivery failed - target user not found: ${targetUserId}`);
              socket.emit('message-error', { error: 'Message delivery failed - recipient not online', messageId: finalMessageId });
              return;
            }

            // Save message to database
            try {
                const newMessage = new Message({
                  sender: user._id,
                  recipient: targetUserId,
                  message_id: finalMessageId,
                  timestamp: new Date(timestamp).getTime(),
                  encryptedMessage: encryptedMessage,
                  iv: finalNonce // Use finalNonce instead of nonce
                });

                await newMessage.save();
                console.log(`💾 Message saved to database with ID: ${finalMessageId}`);
              } catch (dbError) {
                // Handle duplicate key error specifically
                if (dbError.code === 11000 && dbError.keyPattern?.nonce) {
                  console.error('❌ Duplicate nonce detected, regenerating...');
                  // Regenerate nonce and retry
                  const newNonce = require('crypto').randomBytes(16).toString('hex');
                  const retryMessage = new Message({
                    sender: user._id,
                    recipient: targetUserId,
                    message_id: finalMessageId,
                    timestamp: new Date(timestamp).getTime(),
                    encryptedMessage: encryptedMessage,
                    iv: newNonce
                  });
                  await retryMessage.save();
                } else {
                  console.error('❌ Database save error:', dbError);
                  socket.emit('message-error', { error: 'Failed to save message', messageId: finalMessageId });
                  return;
                }
              }


            // Forward message to recipient
            const messageData = {
              ...data,
              from: sender.userId,
              fromUsername: sender.username,
              messageId: finalMessageId
            };
            
            io.to(target.socketId).emit('receive-message', messageData);
            console.log(`✅ Message delivered from ${sender.username} to ${target.username}`);
            
            // Send confirmation to sender
            socket.emit('message-sent-confirmation', { messageId: finalMessageId, timestamp });
            
          } catch (error) {
            console.error('🚨 Error handling message:', error);
            socket.emit('message-error', { error: 'Internal server error', messageId: data.messageId });
          }
        });

        // Handle message history requests
        socket.on('get-message-history', async (data) => {
          try {
            const { otherUserId, limit = 50, offset = 0 } = data;
            
            console.log(`📚 Message history requested by ${user.username} for chat with: ${otherUserId}`);
            
            const messages = await Message.find({
              $or: [
                { sender: user._id, recipient: otherUserId },
                { sender: otherUserId, recipient: user._id }
              ]
            })
            .populate('sender', 'username email')
            .populate('recipient', 'username email')
            .sort({ timestamp: 1 })
            .limit(limit)
            .skip(offset);

            const messageHistory = messages.map(msg => ({
              messageId: msg.message_id,
              from: msg.sender._id.toString(),
              fromUsername: msg.sender.username,
              to: msg.recipient._id.toString(),
              toUsername: msg.recipient.username,
              encryptedMessage: msg.encryptedMessage,
              iv: msg.iv,
              timestamp: new Date(msg.timestamp).toISOString(),
              sent: msg.sender._id.toString() === user._id.toString()
            }));

            socket.emit('message-history', { 
              otherUserId, 
              messages: messageHistory,
              hasMore: messages.length === limit 
            });
            
            console.log(`📤 Sent ${messageHistory.length} messages to ${user.username}`);
            
          } catch (error) {
            console.error('❌ Error fetching message history:', error);
            socket.emit('message-history-error', { error: 'Failed to fetch message history' });
          }
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
          const user = connectedUsers[socket.id];
          if (user) {
            console.log(`❌ ${user.username} disconnected (${reason})`);
            delete connectedUsers[socket.id];
            
            // Broadcast updated user list
            const userList = Object.values(connectedUsers);
            io.emit('online-users', userList);
            console.log(`📊 Updated connected users count: ${userList.length}`);
          } else {
            console.log(`❌ Unknown socket disconnected: ${socket.id}`);
          }
        });

        // Handle generic errors
        socket.on('error', (error) => {
          console.error(`🚨 Socket error from ${user.username}:`, error);
        });

        console.log(`🎉 All event handlers set up for ${user.username}`);

      } catch (err) {
        console.error('🚨 Socket auth error:', err.message);
        console.error('🔍 Full error:', err);
        
        let errorMessage = 'Authentication failed';
        if (err.name === 'JsonWebTokenError') {
          errorMessage = 'Invalid authentication token';
        } else if (err.name === 'TokenExpiredError') {
          errorMessage = 'Authentication token expired';
        } else if (err.name === 'CastError') {
          errorMessage = 'Invalid user ID format in token';
        }
        
        socket.emit('error', `${errorMessage}: ${err.message}`);
        socket.disconnect();
      }
    })();
  });

  // Handle server-level errors
  io.on('error', (error) => {
    console.error('🚨 Socket.IO server error:', error);
  });

  console.log('✅ Socket.IO event handlers configured');
};