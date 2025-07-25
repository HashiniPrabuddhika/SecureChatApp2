const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectedUsers = {}; // socket.id -> user info
const JWT_SECRET = process.env.JWT_SECRET;

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

        // 🔐 Handle connection requests
        socket.on('connection-request', (targetUserId) => {
          console.log(`🤝 Connection request from ${user.username} to user: ${targetUserId}`);
          const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
          const requester = connectedUsers[socket.id];
          
          if (target && requester) {
            console.log(`📤 Sending connection request to ${target.username}`);
            io.to(target.socketId).emit('connection-request-received', {
              userId: requester.userId,
              username: requester.username,
              email: requester.email
            });
            console.log(`✅ Connection request delivered from ${requester.username} to ${target.username}`);
          } else {
            console.log(`❌ Target user not found or not online: ${targetUserId}`);
            socket.emit('error', 'Target user not found or not online');
          }
        });

        // ✅ Handle connection acceptance
        socket.on('connection-request-accept', (fromUserId) => {
          console.log(`✅ Connection request accepted by ${user.username} from user: ${fromUserId}`);
          const requester = Object.values(connectedUsers).find(u => u.userId === fromUserId);
          const accepter = connectedUsers[socket.id];
          
          if (requester && accepter) {
            console.log(`📤 Notifying ${requester.username} that connection was accepted`);
            io.to(requester.socketId).emit('connection-request-accepted', {
              fromUserId: accepter.userId,
              fromUsername: accepter.username
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

        // 💬 Handle message sending
        socket.on('send-message', (data) => {
          const { targetUserId } = data;
          console.log(`💬 Message from ${user.username} to user: ${targetUserId}`);
          
          const target = Object.values(connectedUsers).find(u => u.userId === targetUserId);
          const sender = connectedUsers[socket.id];
          
          if (target && sender) {
            const messageData = {
              ...data,
              from: sender.userId,
              fromUsername: sender.username
            };
            
            io.to(target.socketId).emit('receive-message', messageData);
            console.log(`✅ Message delivered from ${sender.username} to ${target.username}`);
          } else {
            console.log(`❌ Message delivery failed - target user not found: ${targetUserId}`);
            socket.emit('error', 'Message delivery failed - recipient not online');
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