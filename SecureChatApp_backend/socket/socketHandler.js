module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 New socket connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId); // room = user ID
    });

    socket.on('send-message', ({ sender, receiver, content }) => {
      io.to(receiver).emit('receive-message', { sender, content });
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected:', socket.id);
    });
  });
};
