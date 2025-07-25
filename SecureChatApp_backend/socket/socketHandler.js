// module.exports = (io) => {
//   io.on('connection', (socket) => {
//     console.log('🟢 New socket connected:', socket.id);

//     socket.on('join', (userId) => {
//       socket.join(userId); // room = user ID
//     });

//     socket.on('send-message', ({ sender, receiver, content }) => {
//       io.to(receiver).emit('receive-message', { sender, content });
//     });

//     socket.on('disconnect', () => {
//       console.log('🔴 Socket disconnected:', socket.id);
//     });
//   });
// };

// const jwt = require('jsonwebtoken');
// const User = require('../models/User'); // adjust path to your User model
// const connectedUsers = {}; // or wherever you’re storing connected users

// io.on('connection', (socket) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     console.log('No token provided');
//     socket.disconnect();
//     return;
//   }

//   // Wrap async work in an async IIFE (Immediately Invoked Function Expression)
//   (async () => {
//     try {
//       const decoded = jwt.verify(token, JWT_SECRET);

//       const user = await User.findById(decoded.userId);
//       if (!user) {
//         console.log('User not found');
//         socket.disconnect();
//         return;
//       }

//       connectedUsers[socket.id] = {
//         userId: user._id.toString(), // ✅ use DB ID here
//         username: user.username,
//         email: user.email,
//         socketId: socket.id,
//       };

//       // Send updated online users list
//       io.emit('online-users', Object.values(connectedUsers));

//       console.log(`✅ ${user.username} connected`);

//       // Handle disconnect
//       socket.on('disconnect', () => {
//         delete connectedUsers[socket.id];
//         io.emit('online-users', Object.values(connectedUsers));
//         console.log(`❌ ${user.username} disconnected`);
//       });

//       // other socket event handlers (message sending, etc.) go here...

//     } catch (err) {
//       console.error('Socket auth error:', err.message);
//       socket.disconnect();
//     }
//   })();
// });

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = {}; // Track connected users by socket.id

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 New socket connected:', socket.id);

    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log('❌ No token provided');
      socket.disconnect();
      return;
    }

    (async () => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
          console.log('❌ User not found');
          socket.disconnect();
          return;
        }

        connectedUsers[socket.id] = {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          socketId: socket.id,
          hasPublicKey: false, // optional: update when keys arrive
        };

        console.log(`✅ ${user.username} connected`);
        io.emit('online-users', Object.values(connectedUsers));

        // Join personal room
        socket.join(user._id.toString());

        // Public key upload
        socket.on('upload-public-key', ({ publicKey }) => {
          if (connectedUsers[socket.id]) {
            connectedUsers[socket.id].publicKey = publicKey;
            connectedUsers[socket.id].hasPublicKey = true;
            io.emit('user-key-available', {
              userId: connectedUsers[socket.id].userId,
              publicKey
            });
          }
        });

        // Handle request for a public key
        socket.on('request-public-key', (targetUserId) => {
          const userEntry = Object.values(connectedUsers).find(u => u.userId === targetUserId);
          if (userEntry?.publicKey) {
            socket.emit('receive-public-key', {
              userId: userEntry.userId,
              publicKey: userEntry.publicKey
            });
          }
        });

        // Messaging
        socket.on('send-message', (data) => {
          const targetSocket = Object.values(connectedUsers).find(
            u => u.userId === data.targetUserId
          )?.socketId;

          if (targetSocket) {
            io.to(targetSocket).emit('receive-message', {
              ...data,
              from: connectedUsers[socket.id].userId,
              fromUsername: connectedUsers[socket.id].username
            });
          }
        });

        // On disconnect
        socket.on('disconnect', () => {
          console.log(`❌ ${connectedUsers[socket.id]?.username || 'User'} disconnected`);
          delete connectedUsers[socket.id];
          io.emit('online-users', Object.values(connectedUsers));
        });

      } catch (err) {
        console.error('Socket auth error:', err.message);
        socket.disconnect();
      }
    })();
  });
};
