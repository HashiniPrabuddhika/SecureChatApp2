require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketio = require('socket.io'); // You're importing but not using this
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const socketHandler = require('./socket/socketHandler');
const connectDB = require('./config/mongodb');
const { Server } = require('socket.io');
const authenticateToken = require('./middleware/auth');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);

// FIXED: Enhanced Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // Multiple origins
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true
  },
  allowEIO3: true, // Engine.IO v3 compatibility
  transports: ['websocket', 'polling'] // Both transports
});

// FIXED: Enhanced CORS middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"], // Multiple origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

// ADDED: Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ADDED: Health check endpoint for diagnostics
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ADDED: Socket.IO test endpoint
app.get('/socket-test', (req, res) => {
  res.json({ 
    message: 'Socket.IO server is configured',
    connectedClients: io.engine.clientsCount
  });
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// ADDED: Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB
connectDB();

// ADDED: Database connection logging
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Socket.IO setup with error handling
try {
  socketHandler(io);
  console.log('✅ Socket.IO handler initialized');
} catch (error) {
  console.error('❌ Socket.IO handler error:', error);
}

// ADDED: Enhanced server startup logging
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('🚀 Server Configuration:');
  console.log(`   📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`   🔌 Socket.IO: ws://localhost:${PORT}`);
  console.log(`   🌐 CORS Origins: http://localhost:3000, http://127.0.0.1:3000`);
  console.log(`   🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : '❌ NOT SET!'}`);
  console.log(`   📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ Server is ready for connections');
  
  // Test Socket.IO initialization
  console.log(`🔌 Socket.IO Engine: ${io.engine.constructor.name}`);
});

// ADDED: Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    console.log('Process terminated');
  });
});

// ADDED: Unhandled promise rejection handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

module.exports = { app, server, io };