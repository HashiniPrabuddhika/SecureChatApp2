require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketio = require('socket.io');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const socketHandler = require('./socket/socketHandler');
const connectDB = require('./config/mongodb');
const { Server } = require('socket.io');
const authenticateToken = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true,
}));
app.use(express.json());

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Connect to MongoDB
connectDB();

// Socket
socketHandler(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
