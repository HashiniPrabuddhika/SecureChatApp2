// socketHandler.js

const onlineUsers = new Map(); // key: socket.id, value: { userId, username }

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    // Handle user join
    socket.on("join", ({ userId, username, hasPublicKey }) => {
      console.log(`👤 User joined: ${username} (${userId})`);
      socket.join(userId);

      // Save user info
      onlineUsers.set(socket.id, { userId, username, hasPublicKey: !!hasPublicKey });

      // Broadcast updated list to all users
      emitOnlineUsers();
    });

    // Send message to specific user
    socket.on("send-message", ({ sender, receiver, content }) => {
      io.to(receiver).emit("receive-message", { sender, content });
    });

    // Handle manual online users fetch
    socket.on("get-online-users", () => {
      const users = Array.from(onlineUsers.values());
      socket.emit("online-users", users);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
      onlineUsers.delete(socket.id);
      emitOnlineUsers();
    });

    function emitOnlineUsers() {
      const users = Array.from(onlineUsers.values());
      io.emit("online-users", users);
    }
  });
};
