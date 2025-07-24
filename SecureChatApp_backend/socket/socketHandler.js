// socketHandler.js

const onlineUsers = new Map(); // key: socket.id, value: { userId, username }

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    // Handle user join
    socket.on("join", ({ userId, username, hasPublicKey }) => {
      console.log(`👤 User joined: ${username} (${userId})`);
      socket.join(userId);
      socket.userId = userId; // ✅ store for filtering later

      onlineUsers.set(socket.id, {
        userId,
        username,
        hasPublicKey: !!hasPublicKey,
      });

      emitOnlineUsers(); // optional broadcast
    });

    // Send message to specific user
    socket.on("send-message", ({ sender, receiver, content }) => {
      io.to(receiver).emit("receive-message", { sender, content });
    });

    // Handle manual online users fetch
    socket.on("get-online-users", () => {
      const users = Array.from(onlineUsers.values()).filter(
        (user) => user.userId !== socket.userId
      );
      socket.emit("online-users", users);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
      onlineUsers.delete(socket.id);
      emitOnlineUsers();
    });

    socket.on("receive-session-key", ({ fromUserId, encryptedSessionKey }) => {
      const rsaDecrypt = new JSEncrypt();
      rsaDecrypt.setPrivateKey(myKeys.privateKey);
      const aesKey = rsaDecrypt.decrypt(encryptedSessionKey);

      if (aesKey) {
        sessionKeys.current.set(fromUserId, aesKey);
        console.log("🔐 Session key established from", fromUserId);
      } else {
        console.warn("❌ Failed to decrypt session key from", fromUserId);
      }
    });

    socket.on("send-session-key", ({ toUserId, encryptedSessionKey }) => {
      io.to(toUserId).emit("receive-session-key", {
        fromUserId: onlineUsers.get(socket.id)?.userId,
        encryptedSessionKey,
      });
    });

    function emitOnlineUsers() {
      for (const [sockId, userData] of onlineUsers.entries()) {
        const targetSocket = io.sockets.sockets.get(sockId);
        if (targetSocket) {
          const users = Array.from(onlineUsers.values()).filter(
            (u) => u.userId !== userData.userId
          );
          targetSocket.emit("online-users", users);
        }
      }
    }
  });
};
