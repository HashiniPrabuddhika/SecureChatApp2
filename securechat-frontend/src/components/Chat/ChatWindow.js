// import React, { useEffect, useState, useRef } from 'react';
// import io from 'socket.io-client';
// import CryptoJS from 'crypto-js';
// import JSEncrypt from 'jsencrypt';
// import { 
//   FaShieldAlt, FaSignOutAlt, FaUserCircle, FaKey, FaLock, FaUnlockAlt,
//   FaComments, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, 
//   FaLock as FaLockIcon, FaBell, FaTimes, FaCheck, FaUserPlus, FaHeart
// } from 'react-icons/fa';

// export default function ChatApp() {
//   const [socket, setSocket] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState('Connecting...');
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [userKeys, setUserKeys] = useState(new Map());
//   const [currentChat, setCurrentChat] = useState(null);
//   const [myKeys, setMyKeys] = useState({ privateKey: null, publicKey: null });
//   const [currentUserData, setCurrentUserData] = useState({ email: '', username: '' });
//   const [messages, setMessages] = useState([]);
//   const [allMessages, setAllMessages] = useState(new Map()); // Store messages per chat
//   const messageInputRef = useRef(null);
//   const [allUsers, setAllUsers] = useState([]);

//   // Connection request states
//   const [connectionRequestsSent, setConnectionRequestsSent] = useState(new Set());
//   const [connectionRequestsReceived, setConnectionRequestsReceived] = useState([]);
//   const [connectedWith, setConnectedWith] = useState(new Set());
//   const [showConnectionRequests, setShowConnectionRequests] = useState(false);
//   const [showNotification, setShowNotification] = useState(false);
//   const [notificationMessage, setNotificationMessage] = useState('');
//   const [notificationType, setNotificationType] = useState('success');

//   // Debug logs
//   const [debugLogs, setDebugLogs] = useState([]);
  
//   const addDebugLog = (message) => {
//     console.log(`[DEBUG] ${message}`);
//     setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`].slice(-10));
//   };

//   // Show notification function
//   const showNotificationMessage = (message, type = 'success') => {
//     setNotificationMessage(message);
//     setNotificationType(type);
//     setShowNotification(true);
//     setTimeout(() => setShowNotification(false), 4000);
//   };

//   // Helper function to check if chat is fully secure (connected + has keys)
//   const isChatSecure = (userId) => {
//     return connectedWith.has(userId) && userKeys.has(userId);
//   };

//   // Fetch all users
//   useEffect(() => {
//     const storedToken = localStorage.getItem('authToken');
//     const currentEmail = localStorage.getItem('userEmail');

//     addDebugLog(`Stored token exists: ${!!storedToken}`);
//     addDebugLog(`Current email: ${currentEmail}`);

//     if (!storedToken) {
//       addDebugLog('No token found, cannot fetch users');
//       return;
//     }

//     fetch('http://localhost:5000/api/users', {
//       headers: {
//         Authorization: `Bearer ${storedToken}`,
//       },
//     })
//       .then((res) => {
//         addDebugLog(`Users fetch response status: ${res.status}`);
//         if (!res.ok) throw new Error('Failed to fetch users');
//         return res.json();
//       })
//       .then((data) => {
//         const filtered = data.filter((user) => user.email !== currentEmail);
//         addDebugLog(`Fetched ${filtered.length} users`);
//         setAllUsers(filtered);
//       })
//       .catch((err) => {
//         addDebugLog(`Users fetch error: ${err.message}`);
//         console.error('Fetch error:', err);
//       });
//   }, []);

//   // Initialize socket connection
//   useEffect(() => {
//     const token = localStorage.getItem('authToken');
//     const email = localStorage.getItem('userEmail');
//     const username = localStorage.getItem('username');

//     addDebugLog(`Initializing socket with token: ${!!token}, email: ${email}`);

//     if (!token || !email) {
//       addDebugLog('Missing token or email, redirecting to login');
//       window.location.href = '/';
//       return;
//     }

//     setCurrentUserData({ email, username });

//     addDebugLog('Creating socket connection...');
//     const socketClient = io('http://localhost:5000', {
//       auth: { token },
//       forceNew: true,
//       transports: ['websocket', 'polling']
//     });

//     // Add connection error handling
//     socketClient.on('connect_error', (error) => {
//       addDebugLog(`Socket connection error: ${error.message}`);
//       setConnectionStatus('Connection Error');
//       showNotificationMessage(`Connection Error: ${error.message}`, 'error');
//     });

//     socketClient.on('disconnect', (reason) => {
//       addDebugLog(`Socket disconnected: ${reason}`);
//       setConnectionStatus('Disconnected');
//       showNotificationMessage('Disconnected from server', 'error');
//     });

//     setSocket(socketClient);

//     return () => {
//       addDebugLog('Cleaning up socket connection');
//       socketClient.disconnect();
//     };
//   }, []);

//   // Setup socket event listeners
//   useEffect(() => {
//     if (!socket) return;

//     addDebugLog('Setting up socket event listeners');

//     socket.on('connect', () => {
//       addDebugLog('Socket connected successfully');
//       setConnectionStatus('Connected');
//       showNotificationMessage('Connected to SecureChat! 🚀', 'success');
//       generateKeyPair();
//       socket.emit('get-online-users');
//     });

//     socket.on('disconnect', () => {
//       addDebugLog('Socket disconnected');
//       setConnectionStatus('Disconnected');
//     });

//     socket.on('online-users', (users) => {
//       addDebugLog(`Received online users: ${users.length}`);
//       console.log('Online users:', users);
//       setOnlineUsers(users);
//     });

//     socket.on('user-key-available', (data) => {
//       addDebugLog(`Key available for user: ${data.username}`);
//       setUserKeys((prev) => new Map(prev).set(data.userId, data));
//       socket.emit('get-online-users');
//     });

//     socket.on('receive-message', (data) => {
//       addDebugLog(`Received message from: ${data.fromUsername}`);
//       decryptAndDisplayMessage(data);
//     });

//     // Updated connection request handlers
//     socket.on('connection-request-received', (requestData) => {
//       addDebugLog(`Connection request received from: ${requestData.username} with public key`);
      
//       // Store the requester's public key immediately
//       setUserKeys((prev) => new Map(prev).set(requestData.userId, {
//         userId: requestData.userId,
//         username: requestData.username,
//         publicKey: requestData.publicKey
//       }));
      
//       setConnectionRequestsReceived((prev) => {
//         if (prev.find((r) => r.userId === requestData.userId)) return prev;
//         return [...prev, requestData];
//       });
//       showNotificationMessage(`${requestData.username} wants to connect! 📩`, 'info');
//     });

//     socket.on('connection-request-accepted', ({ fromUserId, publicKey }) => {
//       addDebugLog(`Connection request accepted by user: ${fromUserId} with public key`);
      
//       // Store the accepter's public key immediately
//       setUserKeys((prev) => new Map(prev).set(fromUserId, {
//         userId: fromUserId,
//         publicKey: publicKey
//       }));
      
//       setConnectionRequestsSent((prev) => {
//         const newSet = new Set(prev);
//         newSet.delete(fromUserId);
//         return newSet;
//       });
//       setConnectedWith((prev) => new Set(prev).add(fromUserId));
//       const user = allUsers.find(u => u._id === fromUserId);
//       showNotificationMessage(`${user?.username || 'User'} accepted your connection! You can now chat securely! 🎉`, 'success');
//     });

//     socket.on('connection-request-denied', ({ fromUserId }) => {
//       addDebugLog(`Connection request denied by user: ${fromUserId}`);
//       setConnectionRequestsSent((prev) => {
//         const newSet = new Set(prev);
//         newSet.delete(fromUserId);
//         return newSet;
//       });
//       const user = allUsers.find(u => u._id === fromUserId);
//       showNotificationMessage(`${user?.username || 'User'} declined your connection request`, 'info');
//     });

//     socket.on('error', (error) => {
//       addDebugLog(`Socket error: ${error}`);
//       console.error('Socket error:', error);
//       showNotificationMessage(`Socket error: ${error}`, 'error');
//     });

//     return () => {
//       addDebugLog('Removing socket event listeners');
//       socket.off('connect');
//       socket.off('disconnect');
//       socket.off('online-users');
//       socket.off('user-key-available');
//       socket.off('receive-message');
//       socket.off('connection-request-received');
//       socket.off('connection-request-accepted');
//       socket.off('connection-request-denied');
//       socket.off('error');
//     };
//   }, [socket, allUsers]);

//   function generateKeyPair() {
//     addDebugLog('Generating RSA key pair...');
//     const crypt = new JSEncrypt({ default_key_size: 1024 });
//     const privateKey = crypt.getPrivateKey();
//     const publicKey = crypt.getPublicKey();
//     setMyKeys({ privateKey, publicKey });

//     addDebugLog('Uploading public key to server...');
//     socket.emit('upload-public-key', {
//       publicKey,
//       keyType: 'RSA',
//     });
//     showNotificationMessage('Encryption keys generated! 🔐', 'success');
//   }

//   function selectUser(userId, username) {
//     addDebugLog(`Selecting user for chat: ${username} (ID: ${userId})`);
//     setCurrentChat(userId);
    
//     // Load messages for this specific chat
//     const chatMessages = allMessages.get(userId) || [];
//     addDebugLog(`Loading ${chatMessages.length} messages for chat with ${username}`);
//     setMessages(chatMessages);
//   }

//   function sendConnectionRequest(targetUserId) {
//     if (connectionRequestsSent.has(targetUserId) || connectedWith.has(targetUserId)) {
//       addDebugLog('Connection already exists or request already sent');
//       return;
//     }
    
//     if (!myKeys.publicKey) {
//       addDebugLog('Cannot send connection request - no public key available');
//       showNotificationMessage('Please wait for keys to be generated', 'error');
//       return;
//     }
    
//     addDebugLog(`Sending connection request to: ${targetUserId} with public key`);
//     socket.emit('connection-request', targetUserId, myKeys.publicKey);
//     setConnectionRequestsSent((prev) => new Set(prev).add(targetUserId));
//     const user = allUsers.find(u => u._id === targetUserId);
//     showNotificationMessage(`Connection request sent to ${user?.username || 'user'}! 🚀`, 'success');
//   }

//   function acceptConnectionRequest(userId) {
//     addDebugLog(`Accepting connection request from: ${userId}`);
    
//     if (!myKeys.publicKey) {
//       addDebugLog('Cannot accept connection request - no public key available');
//       showNotificationMessage('Please wait for keys to be generated', 'error');
//       return;
//     }
    
//     socket.emit('connection-request-accept', userId, myKeys.publicKey);
//     setConnectedWith((prev) => new Set(prev).add(userId));
//     setConnectionRequestsReceived((prev) => prev.filter((r) => r.userId !== userId));
//     const user = allUsers.find(u => u._id === userId);
//     showNotificationMessage(`Connection accepted! You can now chat securely with ${user?.username || 'user'}! 🎉`, 'success');
//   }

//   function denyConnectionRequest(userId) {
//     addDebugLog(`Denying connection request from: ${userId}`);
//     socket.emit('connection-request-deny', userId);
//     setConnectionRequestsReceived((prev) => prev.filter((r) => r.userId !== userId));
    
//     // Remove the requester's public key since connection was denied
//     setUserKeys((prev) => {
//       const newMap = new Map(prev);
//       newMap.delete(userId);
//       return newMap;
//     });
    
//     showNotificationMessage('Connection request declined', 'info');
//   }

//   function sendMessage() {
//     if (!currentChat) return;
    
//     if (!isChatSecure(currentChat)) {
//       if (!connectedWith.has(currentChat)) {
//         showNotificationMessage('You must establish connection before chatting.', 'error');
//       } else {
//         showNotificationMessage('Waiting for encryption keys to be exchanged.', 'error');
//       }
//       return;
//     }

//     const message = messageInputRef.current.value.trim();
//     if (!message) return;

//     const userKey = userKeys.get(currentChat);
//     if (!userKey) {
//       showNotificationMessage("Recipient's public key not available", 'error');
//       return;
//     }

//     addDebugLog(`Sending message "${message}" to user ID: ${currentChat}`);

//     const aesKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
//     const encryptedMessage = CryptoJS.AES.encrypt(message, aesKey).toString();

//     const rsaEncrypt = new JSEncrypt();
//     rsaEncrypt.setPublicKey(userKey.publicKey);
//     const encryptedAESKey = rsaEncrypt.encrypt(aesKey);

//     const timestamp = new Date().toISOString();
//     const nonce = CryptoJS.lib.WordArray.random(128 / 8).toString();

//     const rsaSign = new JSEncrypt();
//     rsaSign.setPrivateKey(myKeys.privateKey);
//     const signature = rsaSign.sign(message + timestamp + nonce, CryptoJS.SHA256, 'sha256');

//     socket.emit('send-message', {
//       encryptedMessage,
//       encryptedAESKey,
//       timestamp,
//       nonce,
//       signature,
//       targetUserId: currentChat,
//     });

//     const newMsg = {
//       from: currentUserData.email,
//       fromUsername: currentUserData.username,
//       message,
//       timestamp,
//       verified: true,
//       sent: true,
//     };
    
//     addDebugLog(`Storing sent message in chat ID: ${currentChat}`);
    
//     // Add to current messages
//     setMessages((msgs) => [...msgs, newMsg]);
    
//     // Add to all messages for this chat
//     setAllMessages((allMsgs) => {
//       const chatMessages = allMsgs.get(currentChat) || [];
//       const updatedMessages = [...chatMessages, newMsg];
//       const newAllMessages = new Map(allMsgs);
//       newAllMessages.set(currentChat, updatedMessages);
//       addDebugLog(`Chat ${currentChat} now has ${updatedMessages.length} messages after sending`);
//       return newAllMessages;
//     });
    
//     messageInputRef.current.value = '';
//     showNotificationMessage('Message sent securely! 📨', 'success');
//   }

//   function decryptAndDisplayMessage(data) {
//     try {
//       addDebugLog(`Received encrypted message from: ${data.fromUsername} (ID: ${data.from})`);
//       addDebugLog(`Current chat ID: ${currentChat}`);
//       addDebugLog(`Current user email: ${currentUserData.email}`);
      
//       const rsaDecrypt = new JSEncrypt();
//       rsaDecrypt.setPrivateKey(myKeys.privateKey);
//       const aesKey = rsaDecrypt.decrypt(data.encryptedAESKey);
//       if (!aesKey) {
//         addDebugLog('Failed to decrypt AES key');
//         return;
//       }

//       const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, aesKey);
//       const message = decryptedBytes.toString(CryptoJS.enc.Utf8);
//       if (!message) {
//         addDebugLog('Failed to decrypt message content');
//         return;
//       }

//       addDebugLog(`Decrypted message: "${message}"`);

//       let verified = false;
//       if (data.signature) {
//         const senderKey = userKeys.get(data.from);
//         if (senderKey) {
//           const rsaVerify = new JSEncrypt();
//           rsaVerify.setPublicKey(senderKey.publicKey);
//           verified = rsaVerify.verify(message + data.timestamp + data.nonce, data.signature, CryptoJS.SHA256);
//         }
//       }

//       const msgTime = new Date(data.timestamp).getTime();
//       if (Math.abs(Date.now() - msgTime) > 300000) {
//         console.warn('Message timestamp suspicious');
//         return;
//       }

//       // Create the message object
//       const newMsg = {
//         from: data.from,
//         fromUsername: data.fromUsername || data.from,
//         message,
//         timestamp: data.timestamp,
//         verified,
//         sent: false,
//       };

//       // Find the sender's user ID - this might be different from data.from
//       let senderUserId = data.from;
      
//       // Try to find the user in allUsers by matching email or other identifier
//       const senderUser = allUsers.find(u => 
//         u._id === data.from || 
//         u.email === data.from || 
//         u.username === data.fromUsername
//       );
      
//       if (senderUser) {
//         senderUserId = senderUser._id;
//         addDebugLog(`Found sender user: ${senderUser.username} with ID: ${senderUserId}`);
//       } else {
//         addDebugLog(`Could not find sender user in allUsers list`);
//       }

//       addDebugLog(`Storing message in chat ID: ${senderUserId}`);

//       // Store message in the chat with the sender
//       setAllMessages((allMsgs) => {
//         const chatMessages = allMsgs.get(senderUserId) || [];
//         const updatedMessages = [...chatMessages, newMsg];
//         const newAllMessages = new Map(allMsgs);
//         newAllMessages.set(senderUserId, updatedMessages);
//         addDebugLog(`Chat ${senderUserId} now has ${updatedMessages.length} messages`);
//         return newAllMessages;
//       });

//       // If we're currently viewing the chat with the sender, update current messages
//       if (senderUserId === currentChat) {
//         addDebugLog('Adding message to current chat view');
//         setMessages((msgs) => [...msgs, newMsg]);
//       } else {
//         addDebugLog(`Not adding to current view - sender ID ${senderUserId} != current chat ${currentChat}`);
//       }
      
//       // Show notification if we're not currently viewing this chat
//       if (currentChat !== senderUserId) {
//         showNotificationMessage(`New message from ${data.fromUsername}! 📩`, 'info');
//       }
//     } catch (err) {
//       console.error('Error decrypting message:', err);
//       addDebugLog(`Decryption error: ${err.message}`);
//       showNotificationMessage('Failed to decrypt message', 'error');
//     }
//   }

//   function logout() {
//     const token = localStorage.getItem('authToken');
//     fetch('http://localhost:5000/api/logout', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${token}` },
//     }).finally(() => {
//       localStorage.removeItem('authToken');
//       localStorage.removeItem('userEmail');
//       localStorage.removeItem('username');
//       window.location.href = '/';
//     });
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
//       {/* Notification */}
//       {showNotification && (
//         <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl transform transition-all duration-500 ${
//           notificationType === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
//           notificationType === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
//           'bg-gradient-to-r from-blue-500 to-indigo-500'
//         } text-white animate-pulse`}>
//           <div className="flex items-center gap-3">
//             {notificationType === 'success' && <FaCheckCircle className="text-2xl" />}
//             {notificationType === 'error' && <FaExclamationTriangle className="text-2xl" />}
//             {notificationType === 'info' && <FaBell className="text-2xl" />}
//             <span className="font-semibold">{notificationMessage}</span>
//             <button onClick={() => setShowNotification(false)} className="ml-2 hover:bg-white/20 rounded-full p-1">
//               <FaTimes />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <header className="bg-black/50 backdrop-blur-md border-b border-purple-500/30 p-4">
//         <div className="flex justify-between items-center">
//           <h1 className="text-3xl font-bold text-white flex items-center gap-3">
//             <FaShieldAlt className="text-purple-400" /> 
//             <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
//               SecureChat
//             </span>
//           </h1>
          
//           <div className="flex items-center gap-6">
//             {/* Connection Requests in Header */}
//             <div className="relative">
//               <button
//                 onClick={() => setShowConnectionRequests(!showConnectionRequests)}
//                 className="relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
//               >
//                 <FaBell className="text-lg" />
//                 <span className="font-semibold">Requests</span>
//                 {connectionRequestsReceived.length > 0 && (
//                   <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
//                     {connectionRequestsReceived.length}
//                   </span>
//                 )}
//               </button>

//               {/* Connection Requests Dropdown */}
//               {showConnectionRequests && (
//                 <div className="absolute right-0 top-full mt-2 w-96 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-500/30 z-50">
//                   <div className="p-4 border-b border-purple-500/30">
//                     <h3 className="text-white font-bold text-lg flex items-center gap-2">
//                       <FaUserPlus className="text-purple-400" />
//                       Connection Requests ({connectionRequestsReceived.length})
//                     </h3>
//                   </div>
                  
//                   {connectionRequestsReceived.length === 0 ? (
//                     <div className="p-6 text-center text-gray-400">
//                       <FaHeart className="text-4xl mx-auto mb-3 opacity-50" />
//                       <p>No pending requests</p>
//                     </div>
//                   ) : (
//                     <div className="max-h-80 overflow-y-auto">
//                       {connectionRequestsReceived.map((req) => (
//                         <div key={req.userId} className="p-4 border-b border-purple-500/20 hover:bg-purple-500/10 transition-colors">
//                           <div className="flex items-center justify-between">
//                             <div className="flex items-center gap-3">
//                               <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
//                                 <FaUserCircle className="text-2xl text-white" />
//                               </div>
//                               <div>
//                                 <h4 className="text-white font-semibold">{req.username}</h4>
//                                 <p className="text-purple-300 text-sm">wants to connect with you</p>
//                               </div>
//                             </div>
//                             <div className="flex gap-2">
//                               <button
//                                 onClick={() => acceptConnectionRequest(req.userId)}
//                                 className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg"
//                               >
//                                 <FaCheck /> Accept
//                               </button>
//                               <button
//                                 onClick={() => denyConnectionRequest(req.userId)}
//                                 className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg"
//                               >
//                                 <FaTimes /> Decline
//                               </button>
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="flex items-center gap-4">
//               <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2">
//                 <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
//                   <FaUserCircle className="text-white text-lg" />
//                 </div>
//                 <div className="text-white">
//                   <div className="font-semibold">{currentUserData.username}</div>
//                   <div className="text-sm text-purple-300">{currentUserData.email}</div>
//                 </div>
//               </div>
              
//               <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
//                 connectionStatus === 'Connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
//               }`}>
//                 <div className={`w-3 h-3 rounded-full ${
//                   connectionStatus === 'Connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
//                 }`} />
//                 <span className="font-semibold">{connectionStatus}</span>
//               </div>
              
//               <button
//                 onClick={logout}
//                 className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
//               >
//                 <FaSignOutAlt /> Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Container */}
//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar */}
//         <aside className="w-80 bg-black/30 backdrop-blur-md border-r border-purple-500/30">
//           <div className="p-6 border-b border-purple-500/30">
//             <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
//               <FaUser className="text-purple-400" />
//               Online Users ({Math.max(0, onlineUsers.length - 1)})
//             </h3>
//             <div className="bg-purple-500/20 rounded-xl p-3 flex items-center gap-2">
//               <FaKey className="text-purple-400" />
//               <span className="text-white text-sm">
//                 {myKeys.publicKey ? 'Keys ready - Secure communication enabled' : 'Generating keys...'}
//               </span>
//             </div>
//           </div>

//           <div className="flex-1 overflow-y-auto p-4">
//             {allUsers.length === 0 && (
//               <div className="text-gray-400 text-center py-8">No users available</div>
//             )}
//             {/* Sort users: online users first, then offline users */}
//             {allUsers
//               .sort((a, b) => {
//                 const aOnline = onlineUsers.some((u) => u.email === a.email);
//                 const bOnline = onlineUsers.some((u) => u.email === b.email);
//                 if (aOnline && !bOnline) return -1;
//                 if (!aOnline && bOnline) return 1;
//                 return 0;
//               })
//               .map((user) => {
//               const isOnline = onlineUsers.some((u) => u.email === user.email);
//               const isConnected = connectedWith.has(user._id);
//               const hasKey = userKeys.has(user._id);
//               const isSecure = isChatSecure(user._id);
//               const requestSent = connectionRequestsSent.has(user._id);

//               return (
//                 <div
//                   key={user._id}
//                   className={`mb-3 p-4 rounded-xl transition-all duration-300 cursor-pointer hover:bg-purple-500/20 ${
//                     currentChat === user._id ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/50' : 'bg-black/20'
//                   }`}
//                   onClick={() => selectUser(user._id, user.username)}
//                 >
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-3 flex-1">
//                       <div className="relative">
//                         <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
//                           <FaUserCircle className="text-2xl text-white" />
//                         </div>
//                         {isOnline && (
//                           <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
//                         )}
//                       </div>
//                       <div className="flex-1">
//                         <div className="text-white font-semibold">{user.username}</div>
//                         <div className={`text-sm ${isOnline ? 'text-emerald-400' : 'text-gray-400'}`}>
//                           {isOnline ? 'Online' : 'Offline'}
//                         </div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
//                         isSecure ? 'bg-emerald-500/20 text-emerald-400' : 
//                         isConnected ? 'bg-yellow-500/20 text-yellow-400' : 
//                         'bg-red-500/20 text-red-400'
//                       }`}>
//                         {isSecure ? <FaLock /> : isConnected ? <FaKey /> : <FaUnlockAlt />}
//                         {isSecure ? 'Secure' : isConnected ? 'Keys...' : 'No Key'}
//                       </div>

//                       {isConnected ? (
//                         <div className="text-emerald-400" title="Connected">
//                           <FaLockIcon className="text-lg" />
//                         </div>
//                       ) : requestSent ? (
//                         <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-xs font-semibold">
//                           Pending...
//                         </div>
//                       ) : (
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             sendConnectionRequest(user._id);
//                           }}
//                           className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
//                           title="Request Connection"
//                         >
//                           <FaUserPlus />
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </aside>

//         {/* Chat Container */}
//         <section className="flex-1 flex flex-col">
//           {!currentChat ? (
//             <div className="flex-1 flex items-center justify-center bg-black/20">
//               <div className="text-center">
//                 <FaComments className="text-6xl text-purple-400 mb-6 mx-auto opacity-50" />
//                 <div className="text-white text-xl mb-2">Welcome to SecureChat</div>
//                 <div className="text-purple-300">Select a user to start chatting securely</div>
//               </div>
//             </div>
//           ) : (
//             <>
//               <div className="bg-black/30 backdrop-blur-md border-b border-purple-500/30 p-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
//                       <FaUserCircle className="text-white text-lg" />
//                     </div>
//                     <div>
//                       <h3 className="text-white text-lg font-semibold">
//                         {onlineUsers.find((u) => u.userId === currentChat)?.username || allUsers.find(u => u._id === currentChat)?.username || 'Unknown User'}
//                       </h3>
//                       <div className={`text-sm flex items-center gap-2 ${
//                         isChatSecure(currentChat) ? 'text-emerald-400' : 
//                         connectedWith.has(currentChat) ? 'text-yellow-400' : 
//                         'text-red-400'
//                       }`}>
//                         <FaShieldAlt />
//                         {isChatSecure(currentChat)
//                           ? 'End-to-end encrypted'
//                           : connectedWith.has(currentChat)
//                           ? 'Connected - Exchanging keys...'
//                           : 'Connection not established'}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-black/20">
//                 {messages.length === 0 && (
//                   <div className="text-center text-gray-400 py-8">
//                     {!connectedWith.has(currentChat) ? (
//                       <div>
//                         <FaUserPlus className="text-4xl mx-auto mb-3 opacity-50" />
//                         <p>Send a connection request to start chatting</p>
//                       </div>
//                     ) : !isChatSecure(currentChat) ? (
//                       <div>
//                         <FaKey className="text-4xl mx-auto mb-3 opacity-50" />
//                         <p>Exchanging encryption keys...</p>
//                       </div>
//                     ) : (
//                       <div>
//                         <FaComments className="text-4xl mx-auto mb-3 opacity-50" />
//                         <p>Start your secure conversation</p>
//                       </div>
//                     )}
//                   </div>
//                 )}
//                 {messages.map((msg, idx) => {
//                   const time = new Date(msg.timestamp).toLocaleTimeString();
//                   return (
//                     <div
//                       key={idx}
//                       className={`mb-4 flex ${msg.sent ? 'justify-end' : 'justify-start'}`}
//                     >
//                       <div className={`max-w-xs lg:max-w-md ${msg.sent ? 'order-2' : 'order-1'}`}>
//                         <div className={`p-4 rounded-2xl shadow-lg ${
//                           msg.sent 
//                             ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-4' 
//                             : 'bg-black/50 backdrop-blur-md text-white mr-4 border border-purple-500/30'
//                         }`}>
//                           <div className="font-medium">{msg.message}</div>
//                           <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
//                             <span className="text-xs opacity-70">{time}</span>
//                             <div className="flex items-center gap-1 text-xs">
//                               {msg.verified ? (
//                                 <><FaCheckCircle className="text-emerald-400" /> Verified</>
//                               ) : (
//                                 <><FaExclamationTriangle className="text-red-400" /> Unverified</>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               <div className="bg-black/30 backdrop-blur-md border-t border-purple-500/30 p-4">
//                 {!connectedWith.has(currentChat) ? (
//                   <div className="text-center text-gray-400 py-4">
//                     <FaLock className="text-2xl mx-auto mb-2" />
//                     <p>You must establish a connection before chatting</p>
//                   </div>
//                 ) : !isChatSecure(currentChat) ? (
//                   <div className="text-center text-yellow-400 py-4">
//                     <FaKey className="text-2xl mx-auto mb-2" />
//                     <p>Exchanging encryption keys... Please wait</p>
//                   </div>
//                 ) : (
//                   <div className="flex gap-3">
//                     <input
//                       type="text"
//                       ref={messageInputRef}
//                       placeholder="Type your secure message..."
//                       className="flex-1 bg-black/50 text-white placeholder-gray-400 border border-purple-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
//                       onKeyPress={(e) => {
//                         if (e.key === 'Enter') sendMessage();
//                       }}
//                     />
//                     <button
//                       onClick={sendMessage}
//                       className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
//                     >
//                       <FaPaperPlane />
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </section>
//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import { 
  FaShieldAlt, FaSignOutAlt, FaUserCircle, FaKey, FaLock, FaUnlockAlt,
  FaComments, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, 
  FaLock as FaLockIcon, FaBell, FaTimes, FaCheck, FaUserPlus, FaHeart, FaHistory
} from 'react-icons/fa';

export default function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userKeys, setUserKeys] = useState(new Map());
  const [currentChat, setCurrentChat] = useState(null);
  const [myKeys, setMyKeys] = useState({ privateKey: null, publicKey: null });
  const [currentUserData, setCurrentUserData] = useState({ email: '', username: '' });
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState(new Map()); // Store messages per chat
  const messageInputRef = useRef(null);
  const [allUsers, setAllUsers] = useState([]);

  // Connection request states
  const [connectionRequestsSent, setConnectionRequestsSent] = useState(new Set());
  const [connectionRequestsReceived, setConnectionRequestsReceived] = useState([]);
  const [connectedWith, setConnectedWith] = useState(new Set());
  const [showConnectionRequests, setShowConnectionRequests] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  // Message states
  const [pendingMessages, setPendingMessages] = useState(new Map()); // Track message delivery status
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Debug logs
  const [debugLogs, setDebugLogs] = useState([]);
  
  const addDebugLog = (message) => {
    console.log(`[DEBUG] ${message}`);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`].slice(-10));
  };

  // Generate unique message ID
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Show notification function
  const showNotificationMessage = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  // Helper function to check if chat is fully secure (connected + has keys)
  const isChatSecure = (userId) => {
    return connectedWith.has(userId) && userKeys.has(userId);
  };

  // Load message history for a chat
  const loadMessageHistory = (otherUserId) => {
    if (!socket || loadingHistory) return;
    
    addDebugLog(`Loading message history for chat with: ${otherUserId}`);
    setLoadingHistory(true);
    
    socket.emit('get-message-history', {
      otherUserId,
      limit: 50,
      offset: 0
    });
  };

  // Fetch all users
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const currentEmail = localStorage.getItem('userEmail');

    addDebugLog(`Stored token exists: ${!!storedToken}`);
    addDebugLog(`Current email: ${currentEmail}`);

    if (!storedToken) {
      addDebugLog('No token found, cannot fetch users');
      return;
    }

    fetch('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    })
      .then((res) => {
        addDebugLog(`Users fetch response status: ${res.status}`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then((data) => {
        const filtered = data.filter((user) => user.email !== currentEmail);
        addDebugLog(`Fetched ${filtered.length} users`);
        setAllUsers(filtered);
      })
      .catch((err) => {
        addDebugLog(`Users fetch error: ${err.message}`);
        console.error('Fetch error:', err);
      });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');
    const username = localStorage.getItem('username');

    addDebugLog(`Initializing socket with token: ${!!token}, email: ${email}`);

    if (!token || !email) {
      addDebugLog('Missing token or email, redirecting to login');
      window.location.href = '/';
      return;
    }

    setCurrentUserData({ email, username });

    addDebugLog('Creating socket connection...');
    const socketClient = io('http://localhost:5000', {
      auth: { token },
      forceNew: true,
      transports: ['websocket', 'polling']
    });

    // Add connection error handling
    socketClient.on('connect_error', (error) => {
      addDebugLog(`Socket connection error: ${error.message}`);
      setConnectionStatus('Connection Error');
      showNotificationMessage(`Connection Error: ${error.message}`, 'error');
    });

    socketClient.on('disconnect', (reason) => {
      addDebugLog(`Socket disconnected: ${reason}`);
      setConnectionStatus('Disconnected');
      showNotificationMessage('Disconnected from server', 'error');
    });

    setSocket(socketClient);

    return () => {
      addDebugLog('Cleaning up socket connection');
      socketClient.disconnect();
    };
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return;

    addDebugLog('Setting up socket event listeners');

    socket.on('connect', () => {
      addDebugLog('Socket connected successfully');
      setConnectionStatus('Connected');
      showNotificationMessage('Connected to SecureChat! 🚀', 'success');
      generateKeyPair();
      socket.emit('get-online-users');
    });

    socket.on('disconnect', () => {
      addDebugLog('Socket disconnected');
      setConnectionStatus('Disconnected');
    });

    socket.on('online-users', (users) => {
      addDebugLog(`Received online users: ${users.length}`);
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    socket.on('user-key-available', (data) => {
      addDebugLog(`Key available for user: ${data.username}`);
      setUserKeys((prev) => new Map(prev).set(data.userId, data));
      socket.emit('get-online-users');
    });

    // Message handling
    socket.on('receive-message', (data) => {
      addDebugLog(`Received message from: ${data.fromUsername}`);
      decryptAndDisplayMessage(data);
    });

    socket.on('message-sent-confirmation', (data) => {
      addDebugLog(`Message delivery confirmed: ${data.messageId}`);
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.messageId);
        return newMap;
      });
      showNotificationMessage('Message delivered successfully! ✅', 'success');
    });

    socket.on('message-error', (data) => {
      addDebugLog(`Message error: ${data.error} for message ${data.messageId}`);
      setPendingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.messageId);
        return newMap;
      });
      showNotificationMessage(`Message error: ${data.error}`, 'error');
    });

    // Message history handling
    socket.on('message-history', (data) => {
      addDebugLog(`Received ${data.messages.length} historical messages for chat with: ${data.otherUserId}`);
      setLoadingHistory(false);
      
      if (data.messages.length > 0) {
        const decryptedMessages = [];
        
        // Decrypt and process historical messages
        data.messages.forEach(msg => {
          try {
            // Decrypt the message
            const rsaDecrypt = new JSEncrypt();
            rsaDecrypt.setPrivateKey(myKeys.privateKey);
            
            // For historical messages, we need to handle the encryption differently
            // This assumes the encryptedMessage contains the AES encrypted content
            // and we need to reconstruct the process
            
            const decryptedMsg = {
              from: msg.from,
              fromUsername: msg.fromUsername,
              message: `Message from previous session`, // Placeholder for now
              timestamp: msg.timestamp,
              verified: false,
              sent: msg.sent,
              messageId: msg.messageId
            };
            
            decryptedMessages.push(decryptedMsg);
          } catch (error) {
            addDebugLog(`Failed to decrypt historical message: ${msg.messageId}`);
          }
        });
        
        // Store in allMessages
        setAllMessages((allMsgs) => {
          const newAllMessages = new Map(allMsgs);
          newAllMessages.set(data.otherUserId, decryptedMessages);
          return newAllMessages;
        });
        
        // If we're currently viewing this chat, update current messages
        if (currentChat === data.otherUserId) {
          setMessages(decryptedMessages);
        }
      }
    });

    socket.on('message-history-error', (data) => {
      addDebugLog(`Message history error: ${data.error}`);
      setLoadingHistory(false);
      showNotificationMessage(`Failed to load message history: ${data.error}`, 'error');
    });

    // Updated connection request handlers
    socket.on('connection-request-received', (requestData) => {
      addDebugLog(`Connection request received from: ${requestData.username} with public key`);
      
      // Store the requester's public key immediately
      setUserKeys((prev) => new Map(prev).set(requestData.userId, {
        userId: requestData.userId,
        username: requestData.username,
        publicKey: requestData.publicKey
      }));
      
      setConnectionRequestsReceived((prev) => {
        if (prev.find((r) => r.userId === requestData.userId)) return prev;
        return [...prev, requestData];
      });
      showNotificationMessage(`${requestData.username} wants to connect! 📩`, 'info');
    });

    socket.on('connection-request-accepted', ({ fromUserId, publicKey }) => {
      addDebugLog(`Connection request accepted by user: ${fromUserId} with public key`);
      
      // Store the accepter's public key immediately
      setUserKeys((prev) => new Map(prev).set(fromUserId, {
        userId: fromUserId,
        publicKey: publicKey
      }));
      
      setConnectionRequestsSent((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fromUserId);
        return newSet;
      });
      setConnectedWith((prev) => new Set(prev).add(fromUserId));
      const user = allUsers.find(u => u._id === fromUserId);
      showNotificationMessage(`${user?.username || 'User'} accepted your connection! You can now chat securely! 🎉`, 'success');
      
      // Load message history for this newly connected user
      loadMessageHistory(fromUserId);
    });

    socket.on('connection-request-denied', ({ fromUserId }) => {
      addDebugLog(`Connection request denied by user: ${fromUserId}`);
      setConnectionRequestsSent((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fromUserId);
        return newSet;
      });
      const user = allUsers.find(u => u._id === fromUserId);
      showNotificationMessage(`${user?.username || 'User'} declined your connection request`, 'info');
    });

    socket.on('error', (error) => {
      addDebugLog(`Socket error: ${error}`);
      console.error('Socket error:', error);
      showNotificationMessage(`Socket error: ${error}`, 'error');
    });

    return () => {
      addDebugLog('Removing socket event listeners');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('online-users');
      socket.off('user-key-available');
      socket.off('receive-message');
      socket.off('message-sent-confirmation');
      socket.off('message-error');
      socket.off('message-history');
      socket.off('message-history-error');
      socket.off('connection-request-received');
      socket.off('connection-request-accepted');
      socket.off('connection-request-denied');
      socket.off('error');
    };
  }, [socket, allUsers, myKeys.privateKey, currentChat]);

  function generateKeyPair() {
    addDebugLog('Generating RSA key pair...');
    const crypt = new JSEncrypt({ default_key_size: 1024 });
    const privateKey = crypt.getPrivateKey();
    const publicKey = crypt.getPublicKey();
    setMyKeys({ privateKey, publicKey });

    addDebugLog('Uploading public key to server...');
    socket.emit('upload-public-key', {
      publicKey,
      keyType: 'RSA',
    });
    showNotificationMessage('Encryption keys generated! 🔐', 'success');
  }

  function selectUser(userId, username) {
    addDebugLog(`Selecting user for chat: ${username} (ID: ${userId})`);
    setCurrentChat(userId);
    
    // Load messages for this specific chat
    const chatMessages = allMessages.get(userId) || [];
    addDebugLog(`Loading ${chatMessages.length} messages for chat with ${username}`);
    setMessages(chatMessages);
    
    // Load message history if connected and secure
    if (isChatSecure(userId)) {
      loadMessageHistory(userId);
    }
  }

  function sendConnectionRequest(targetUserId) {
    if (connectionRequestsSent.has(targetUserId) || connectedWith.has(targetUserId)) {
      addDebugLog('Connection already exists or request already sent');
      return;
    }
    
    if (!myKeys.publicKey) {
      addDebugLog('Cannot send connection request - no public key available');
      showNotificationMessage('Please wait for keys to be generated', 'error');
      return;
    }
    
    addDebugLog(`Sending connection request to: ${targetUserId} with public key`);
    socket.emit('connection-request', targetUserId, myKeys.publicKey);
    setConnectionRequestsSent((prev) => new Set(prev).add(targetUserId));
    const user = allUsers.find(u => u._id === targetUserId);
    showNotificationMessage(`Connection request sent to ${user?.username || 'user'}! 🚀`, 'success');
  }

  function acceptConnectionRequest(userId) {
    addDebugLog(`Accepting connection request from: ${userId}`);
    
    if (!myKeys.publicKey) {
      addDebugLog('Cannot accept connection request - no public key available');
      showNotificationMessage('Please wait for keys to be generated', 'error');
      return;
    }
    
    socket.emit('connection-request-accept', userId, myKeys.publicKey);
    setConnectedWith((prev) => new Set(prev).add(userId));
    setConnectionRequestsReceived((prev) => prev.filter((r) => r.userId !== userId));
    const user = allUsers.find(u => u._id === userId);
    showNotificationMessage(`Connection accepted! You can now chat securely with ${user?.username || 'user'}! 🎉`, 'success');
    
    // Load message history for this newly connected user
    loadMessageHistory(userId);
  }

  function denyConnectionRequest(userId) {
    addDebugLog(`Denying connection request from: ${userId}`);
    socket.emit('connection-request-deny', userId);
    setConnectionRequestsReceived((prev) => prev.filter((r) => r.userId !== userId));
    
    // Remove the requester's public key since connection was denied
    setUserKeys((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    
    showNotificationMessage('Connection request declined', 'info');
  }

  function sendMessage() {
    if (!currentChat) return;
    
    if (!isChatSecure(currentChat)) {
      if (!connectedWith.has(currentChat)) {
        showNotificationMessage('You must establish connection before chatting.', 'error');
      } else {
        showNotificationMessage('Waiting for encryption keys to be exchanged.', 'error');
      }
      return;
    }

    
    const message = messageInputRef.current.value.trim();
    if (!message) return;

    const userKey = userKeys.get(currentChat);
    if (!userKey) {
      showNotificationMessage("Recipient's public key not available", 'error');
      return;
    }

    addDebugLog(`Sending message "${message}" to user ID: ${currentChat}`);

    // Generate unique message ID and timestamp
    const messageId = generateMessageId();
    const timestamp = new Date().toISOString();
    const nonce = CryptoJS.lib.WordArray.random(128 / 8).toString(); // Always generate nonce

    // Ensure nonce is not empty
    if (!nonce) {
        showNotificationMessage('Failed to generate security nonce', 'error');
        return;
    }

    // Encrypt message with AES
    const aesKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    const encryptedMessage = CryptoJS.AES.encrypt(message, aesKey).toString();

    // Encrypt AES key with recipient's RSA public key
    const rsaEncrypt = new JSEncrypt();
    rsaEncrypt.setPublicKey(userKey.publicKey);
    const encryptedAESKey = rsaEncrypt.encrypt(aesKey);

    // Sign the message
    const rsaSign = new JSEncrypt();
    rsaSign.setPrivateKey(myKeys.privateKey);
    const signature = rsaSign.sign(message + timestamp + nonce, CryptoJS.SHA256, 'sha256');

    // Track pending message
    setPendingMessages((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, { timestamp, message });
      return newMap;
    });

    // Send message via socket
    socket.emit('send-message', {
        encryptedMessage,
        encryptedAESKey,
        timestamp,
        nonce, // Always include nonce
        signature,
        targetUserId: currentChat,
        messageId
    });

    // Create message object for local display
    const newMsg = {
      from: currentUserData.email,
      fromUsername: currentUserData.username,
      message,
      timestamp,
      verified: true,
      sent: true,
      messageId,
      pending: true
    };
    
    addDebugLog(`Storing sent message in chat ID: ${currentChat}`);
    
    // Add to current messages
    setMessages((msgs) => [...msgs, newMsg]);
    
    // Add to all messages for this chat
    setAllMessages((allMsgs) => {
      const chatMessages = allMsgs.get(currentChat) || [];
      const updatedMessages = [...chatMessages, newMsg];
      const newAllMessages = new Map(allMsgs);
      newAllMessages.set(currentChat, updatedMessages);
      addDebugLog(`Chat ${currentChat} now has ${updatedMessages.length} messages after sending`);
      return newAllMessages;
    });
    
    messageInputRef.current.value = '';
    showNotificationMessage('Message sent securely! 📨', 'success');
  }

  function decryptAndDisplayMessage(data) {
    try {
      addDebugLog(`Received encrypted message from: ${data.fromUsername} (ID: ${data.from})`);
      addDebugLog(`Current chat ID: ${currentChat}`);
      addDebugLog(`Current user email: ${currentUserData.email}`);
      
      const rsaDecrypt = new JSEncrypt();
      rsaDecrypt.setPrivateKey(myKeys.privateKey);
      const aesKey = rsaDecrypt.decrypt(data.encryptedAESKey);
      if (!aesKey) {
        addDebugLog('Failed to decrypt AES key');
        return;
      }

      const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, aesKey);
      const message = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!message) {
        addDebugLog('Failed to decrypt message content');
        return;
      }

      addDebugLog(`Decrypted message: "${message}"`);

      let verified = false;
      if (data.signature) {
        const senderKey = userKeys.get(data.from);
        if (senderKey) {
          const rsaVerify = new JSEncrypt();
          rsaVerify.setPublicKey(senderKey.publicKey);
          verified = rsaVerify.verify(message + data.timestamp + data.nonce, data.signature, CryptoJS.SHA256);
        }
      }

      const msgTime = new Date(data.timestamp).getTime();
      if (Math.abs(Date.now() - msgTime) > 300000) {
        console.warn('Message timestamp suspicious');
        return;
      }

      // Create the message object
      const newMsg = {
        from: data.from,
        fromUsername: data.fromUsername || data.from,
        message,
        timestamp: data.timestamp,
        verified,
        sent: false,
        messageId: data.messageId || generateMessageId()
      };

      // Find the sender's user ID - this might be different from data.from
      let senderUserId = data.from;
      
      // Try to find the user in allUsers by matching email or other identifier
      const senderUser = allUsers.find(u => 
        u._id === data.from || 
        u.email === data.from || 
        u.username === data.fromUsername
      );
      
      if (senderUser) {
        senderUserId = senderUser._id;
        addDebugLog(`Found sender user: ${senderUser.username} with ID: ${senderUserId}`);
      } else {
        addDebugLog(`Could not find sender user in allUsers list`);
      }

      addDebugLog(`Storing message in chat ID: ${senderUserId}`);

      // Store message in the chat with the sender
      setAllMessages((allMsgs) => {
        const chatMessages = allMsgs.get(senderUserId) || [];
        const updatedMessages = [...chatMessages, newMsg];
        const newAllMessages = new Map(allMsgs);
        newAllMessages.set(senderUserId, updatedMessages);
        addDebugLog(`Chat ${senderUserId} now has ${updatedMessages.length} messages`);
        return newAllMessages;
      });

      // If we're currently viewing the chat with the sender, update current messages
      if (senderUserId === currentChat) {
        addDebugLog('Adding message to current chat view');
        setMessages((msgs) => [...msgs, newMsg]);
      } else {
        addDebugLog(`Not adding to current view - sender ID ${senderUserId} != current chat ${currentChat}`);
      }
      
      // Show notification if we're not currently viewing this chat
      if (currentChat !== senderUserId) {
        showNotificationMessage(`New message from ${data.fromUsername}! 📩`, 'info');
      }
    } catch (err) {
      console.error('Error decrypting message:', err);
      addDebugLog(`Decryption error: ${err.message}`);
      showNotificationMessage('Failed to decrypt message', 'error');
    }
  }

  function logout() {
    const token = localStorage.getItem('authToken');
    fetch('http://localhost:5000/api/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).finally(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
      window.location.href = '/';
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl transform transition-all duration-500 ${
          notificationType === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
          notificationType === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
          'bg-gradient-to-r from-blue-500 to-indigo-500'
        } text-white animate-pulse`}>
          <div className="flex items-center gap-3">
            {notificationType === 'success' && <FaCheckCircle className="text-2xl" />}
            {notificationType === 'error' && <FaExclamationTriangle className="text-2xl" />}
            {notificationType === 'info' && <FaBell className="text-2xl" />}
            <span className="font-semibold">{notificationMessage}</span>
            <button onClick={() => setShowNotification(false)} className="ml-2 hover:bg-white/20 rounded-full p-1">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-purple-500/30 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FaShieldAlt className="text-purple-400" /> 
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              SecureChat
            </span>
          </h1>
          
          <div className="flex items-center gap-6">
            {/* Connection Requests in Header */}
            <div className="relative">
              <button
                onClick={() => setShowConnectionRequests(!showConnectionRequests)}
                className="relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
              >
                <FaBell className="text-lg" />
                <span className="font-semibold">Requests</span>
                {connectionRequestsReceived.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
                    {connectionRequestsReceived.length}
                  </span>
                )}
              </button>

              {/* Connection Requests Dropdown */}
              {showConnectionRequests && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-500/30 z-50">
                  <div className="p-4 border-b border-purple-500/30">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <FaUserPlus className="text-purple-400" />
                      Connection Requests ({connectionRequestsReceived.length})
                    </h3>
                  </div>
                  
                  {connectionRequestsReceived.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <FaHeart className="text-4xl mx-auto mb-3 opacity-50" />
                      <p>No pending requests</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {connectionRequestsReceived.map((req) => (
                        <div key={req.userId} className="p-4 border-b border-purple-500/20 hover:bg-purple-500/10 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <FaUserCircle className="text-2xl text-white" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{req.username}</h4>
                                <p className="text-purple-300 text-sm">wants to connect with you</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => acceptConnectionRequest(req.userId)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg"
                              >
                                <FaCheck /> Accept
                              </button>
                              <button
                                onClick={() => denyConnectionRequest(req.userId)}
                                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg"
                              >
                                <FaTimes /> Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <FaUserCircle className="text-white text-lg" />
                </div>
                <div className="text-white">
                  <div className="font-semibold">{currentUserData.username}</div>
                  <div className="text-sm text-purple-300">{currentUserData.email}</div>
                </div>
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'Connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'Connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="font-semibold">{connectionStatus}</span>
              </div>
              
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-black/30 backdrop-blur-md border-r border-purple-500/30">
          <div className="p-6 border-b border-purple-500/30">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
              <FaUser className="text-purple-400" />
              Online Users ({Math.max(0, onlineUsers.length - 1)})
            </h3>
            <div className="bg-purple-500/20 rounded-xl p-3 flex items-center gap-2">
              <FaKey className="text-purple-400" />
              <span className="text-white text-sm">
                {myKeys.publicKey ? 'Keys ready - Secure communication enabled' : 'Generating keys...'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {allUsers.length === 0 && (
              <div className="text-gray-400 text-center py-8">No users available</div>
            )}
            {/* Sort users: online users first, then offline users */}
            {allUsers
              .sort((a, b) => {
                const aOnline = onlineUsers.some((u) => u.email === a.email);
                const bOnline = onlineUsers.some((u) => u.email === b.email);
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;
                return 0;
              })
              .map((user) => {
              const isOnline = onlineUsers.some((u) => u.email === user.email);
              const isConnected = connectedWith.has(user._id);
              const hasKey = userKeys.has(user._id);
              const isSecure = isChatSecure(user._id);
              const requestSent = connectionRequestsSent.has(user._id);
              const hasMessages = allMessages.has(user._id) && allMessages.get(user._id).length > 0;

              return (
                <div
                  key={user._id}
                  className={`mb-3 p-4 rounded-xl transition-all duration-300 cursor-pointer hover:bg-purple-500/20 ${
                    currentChat === user._id ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/50' : 'bg-black/20'
                  }`}
                  onClick={() => selectUser(user._id, user.username)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <FaUserCircle className="text-2xl text-white" />
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-black animate-pulse" />
                        )}
                        {hasMessages && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                            <FaHistory className="text-xs text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{user.username}</div>
                        <div className={`text-sm ${isOnline ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                          {hasMessages && <span className="ml-2 text-blue-400">• Messages</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                        isSecure ? 'bg-emerald-500/20 text-emerald-400' : 
                        isConnected ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {isSecure ? <FaLock /> : isConnected ? <FaKey /> : <FaUnlockAlt />}
                        {isSecure ? 'Secure' : isConnected ? 'Keys...' : 'No Key'}
                      </div>

                      {isConnected ? (
                        <div className="text-emerald-400" title="Connected">
                          <FaLockIcon className="text-lg" />
                        </div>
                      ) : requestSent ? (
                        <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-xs font-semibold">
                          Pending...
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendConnectionRequest(user._id);
                          }}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                          title="Request Connection"
                        >
                          <FaUserPlus />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Chat Container */}
        <section className="flex-1 flex flex-col">
          {!currentChat ? (
            <div className="flex-1 flex items-center justify-center bg-black/20">
              <div className="text-center">
                <FaComments className="text-6xl text-purple-400 mb-6 mx-auto opacity-50" />
                <div className="text-white text-xl mb-2">Welcome to SecureChat</div>
                <div className="text-purple-300">Select a user to start chatting securely</div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-black/30 backdrop-blur-md border-b border-purple-500/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <FaUserCircle className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-semibold">
                        {onlineUsers.find((u) => u.userId === currentChat)?.username || allUsers.find(u => u._id === currentChat)?.username || 'Unknown User'}
                      </h3>
                      <div className={`text-sm flex items-center gap-2 ${
                        isChatSecure(currentChat) ? 'text-emerald-400' : 
                        connectedWith.has(currentChat) ? 'text-yellow-400' : 
                        'text-red-400'
                      }`}>
                        <FaShieldAlt />
                        {isChatSecure(currentChat)
                          ? 'End-to-end encrypted'
                          : connectedWith.has(currentChat)
                          ? 'Connected - Exchanging keys...'
                          : 'Connection not established'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Loading History Indicator */}
                  {loadingHistory && (
                    <div className="flex items-center gap-2 text-purple-400">
                      <FaHistory className="animate-spin" />
                      <span className="text-sm">Loading history...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-transparent to-black/20">
                {messages.length === 0 && !loadingHistory && (
                  <div className="text-center text-gray-400 py-8">
                    {!connectedWith.has(currentChat) ? (
                      <div>
                        <FaUserPlus className="text-4xl mx-auto mb-3 opacity-50" />
                        <p>Send a connection request to start chatting</p>
                      </div>
                    ) : !isChatSecure(currentChat) ? (
                      <div>
                        <FaKey className="text-4xl mx-auto mb-3 opacity-50" />
                        <p>Exchanging encryption keys...</p>
                      </div>
                    ) : (
                      <div>
                        <FaComments className="text-4xl mx-auto mb-3 opacity-50" />
                        <p>Start your secure conversation</p>
                      </div>
                    )}
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const time = new Date(msg.timestamp).toLocaleTimeString();
                  const isPending = pendingMessages.has(msg.messageId);
                  return (
                    <div
                      key={idx}
                      className={`mb-4 flex ${msg.sent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${msg.sent ? 'order-2' : 'order-1'}`}>
                        <div className={`p-4 rounded-2xl shadow-lg ${
                          msg.sent 
                            ? `bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-4 ${isPending ? 'opacity-70' : ''}` 
                            : 'bg-black/50 backdrop-blur-md text-white mr-4 border border-purple-500/30'
                        }`}>
                          <div className="font-medium">{msg.message}</div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                            <span className="text-xs opacity-70">{time}</span>
                            <div className="flex items-center gap-1 text-xs">
                              {isPending ? (
                                <><div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" /> Sending...</>
                              ) : msg.verified ? (
                                <><FaCheckCircle className="text-emerald-400" /> Verified</>
                              ) : (
                                <> 🛡️ Secured</>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-black/30 backdrop-blur-md border-t border-purple-500/30 p-4">
                {!connectedWith.has(currentChat) ? (
                  <div className="text-center text-gray-400 py-4">
                    <FaLock className="text-2xl mx-auto mb-2" />
                    <p>You must establish a connection before chatting</p>
                  </div>
                ) : !isChatSecure(currentChat) ? (
                  <div className="text-center text-yellow-400 py-4">
                    <FaKey className="text-2xl mx-auto mb-2" />
                    <p>Exchanging encryption keys... Please wait</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      ref={messageInputRef}
                      placeholder="Type your secure message..."
                      className="flex-1 bg-black/50 text-white placeholder-gray-400 border border-purple-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') sendMessage();
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-purple-500/25"
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}