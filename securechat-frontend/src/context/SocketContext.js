// import { createContext, useContext, useEffect, useState } from "react";
// import { io } from "socket.io-client";

// export const SocketContext = createContext();

// export const SocketProvider = ({ children }) => {
//   const [socket, setSocket] = useState(null);

//   useEffect(() => {
//     const sock = io("http://localhost:5000", {
//       withCredentials: true,
//     });
//     setSocket(sock);
//     return () => sock.disconnect();
//   }, []);

//   return (
//     <SocketContext.Provider value={socket}>
//       {children}
//     </SocketContext.Provider>
//   );
// };

// export const useSocket = () => useContext(SocketContext);
 
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageHistory, setMessageHistory] = useState(new Map());
  const [pendingMessages, setPendingMessages] = useState(new Map());

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.log('No auth token found for socket connection');
      return;
    }

    console.log('🚀 Initializing Socket.IO connection...');
    
    const sock = io("http://localhost:5000", {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    // Connection event handlers
    sock.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setConnectionStatus('Connected');
    });

    sock.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('Connection Error');
    });

    sock.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${reason}`);
      setConnectionStatus('Disconnected');
    });

    // User management events
    sock.on('online-users', (users) => {
      console.log(`👥 Online users updated: ${users.length} users`);
      setOnlineUsers(users);
    });

    // Message events
    sock.on('message-sent-confirmation', (data) => {
      console.log(`✅ Message delivery confirmed: ${data.messageId}`);
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.messageId);
        return newMap;
      });
    });

    sock.on('message-error', (data) => {
      console.error(`❌ Message error: ${data.error} for message ${data.messageId}`);
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.messageId);
        return newMap;
      });
    });

    sock.on('message-history', (data) => {
      console.log(`📚 Received ${data.messages.length} historical messages for chat with: ${data.otherUserId}`);
      setMessageHistory((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.otherUserId, data.messages);
        return newMap;
      });
    });

    sock.on('message-history-error', (data) => {
      console.error(`❌ Message history error: ${data.error}`);
    });

    // Generic error handler
    sock.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });

    setSocket(sock);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      sock.disconnect();
    };
  }, []);

  // Helper functions
  const sendMessage = (messageData) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`📤 Sending message to ${messageData.targetUserId}`);
    
    // Track pending message
    setPendingMessages((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageData.messageId, {
        timestamp: messageData.timestamp,
        targetUserId: messageData.targetUserId
      });
      return newMap;
    });

    socket.emit('send-message', messageData);
    return true;
  };

  const requestMessageHistory = (otherUserId, limit = 50, offset = 0) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`📚 Requesting message history for chat with: ${otherUserId}`);
    socket.emit('get-message-history', { otherUserId, limit, offset });
    return true;
  };

  const sendConnectionRequest = (targetUserId, publicKey) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`🤝 Sending connection request to: ${targetUserId}`);
    socket.emit('connection-request', targetUserId, publicKey);
    return true;
  };

  const acceptConnectionRequest = (fromUserId, publicKey) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`✅ Accepting connection request from: ${fromUserId}`);
    socket.emit('connection-request-accept', fromUserId, publicKey);
    return true;
  };

  const denyConnectionRequest = (fromUserId) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`❌ Denying connection request from: ${fromUserId}`);
    socket.emit('connection-request-deny', fromUserId);
    return true;
  };

  const uploadPublicKey = (publicKey, keyType) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`🔑 Uploading public key (type: ${keyType})`);
    socket.emit('upload-public-key', { publicKey, keyType });
    return true;
  };

  const requestPublicKey = (targetUserId) => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log(`🔑 Requesting public key for user: ${targetUserId}`);
    socket.emit('request-public-key', targetUserId);
    return true;
  };

  const getOnlineUsers = () => {
    if (!socket) {
      console.error('Socket not connected');
      return false;
    }

    console.log('👥 Requesting online users list');
    socket.emit('get-online-users');
    return true;
  };

  // Context value
  const contextValue = {
    socket,
    connectionStatus,
    onlineUsers,
    messageHistory,
    pendingMessages,
    // Helper functions
    sendMessage,
    requestMessageHistory,
    sendConnectionRequest,
    acceptConnectionRequest,
    denyConnectionRequest,
    uploadPublicKey,
    requestPublicKey,
    getOnlineUsers,
    // State setters (for advanced usage)
    setOnlineUsers,
    setMessageHistory,
    setPendingMessages
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for using socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
};

// Additional hooks for specific functionality
export const useSocketConnection = () => {
  const { socket, connectionStatus } = useSocket();
  return { socket, connectionStatus, isConnected: connectionStatus === 'Connected' };
};

export const useOnlineUsers = () => {
  const { onlineUsers, getOnlineUsers } = useSocket();
  return { onlineUsers, refreshOnlineUsers: getOnlineUsers };
};

export const useMessages = () => {
  const { messageHistory, pendingMessages, sendMessage, requestMessageHistory } = useSocket();
  return { messageHistory, pendingMessages, sendMessage, requestMessageHistory };
};

export const useConnections = () => {
  const { 
    sendConnectionRequest, 
    acceptConnectionRequest, 
    denyConnectionRequest,
    uploadPublicKey,
    requestPublicKey
  } = useSocket();
  
  return {
    sendConnectionRequest,
    acceptConnectionRequest, 
    denyConnectionRequest,
    uploadPublicKey,
    requestPublicKey
  };
};