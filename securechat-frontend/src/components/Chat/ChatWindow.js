import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import '../css/chatwindow.css'; 

import { FaShieldAlt, FaSignOutAlt, FaUserCircle, FaKey, FaLock, FaUnlockAlt, FaComments, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userKeys, setUserKeys] = useState(new Map());
  const [currentChat, setCurrentChat] = useState(null);
  const [myKeys, setMyKeys] = useState({ privateKey: null, publicKey: null });
  const [currentUserData, setCurrentUserData] = useState({ email: '', username: '' });
  const [messages, setMessages] = useState([]); // messages for current chat
  const messageInputRef = useRef(null);
  const [allUsers, setAllUsers] = useState([]);

useEffect(() => {
  const storedToken = localStorage.getItem('authToken');
  const currentEmail = localStorage.getItem('userEmail');

  if (!storedToken) return;

  fetch('http://localhost:5000/api/users', {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    })
    .then((data) => {
      // Remove current user from the list
      const filtered = data.filter((user) => user.email !== currentEmail);
      setAllUsers(filtered);
    })
    .catch((err) => {
      console.error('Fetch error:', err);
    });
}, []);


  // Load token & user info from localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');
    const username = localStorage.getItem('username');

    if (!token || !email) {
      window.location.href = '/';
      return;
    }

    setCurrentUserData({
      email,
      username: username || email.split('@')[0]
    });

    // Initialize socket
    const socketClient = io({
      auth: { token }
    });

    setSocket(socketClient);

    // Cleanup socket on unmount
    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Setup socket events & key generation
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      setConnectionStatus('Connected');
      generateKeyPair();
      socket.emit('get-online-users');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    socket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user-key-available', (data) => {
      setUserKeys(prev => new Map(prev).set(data.userId, data));
      socket.emit('get-online-users');
    });

    socket.on('receive-public-key', (data) => {
      setUserKeys(prev => new Map(prev).set(data.userId, data));
    });

    socket.on('receive-message', (data) => {
      decryptAndDisplayMessage(data);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Generate RSA key pair
  function generateKeyPair() {
    const crypt = new JSEncrypt({ default_key_size: 1024 });
    const privateKey = crypt.getPrivateKey();
    const publicKey = crypt.getPublicKey();
    setMyKeys({ privateKey, publicKey });

    socket.emit('upload-public-key', {
      publicKey,
      keyType: 'RSA'
    });
  }

  function selectUser(userId, username) {
  setCurrentChat(userId);
  setMessages([]);

  if (!userKeys.has(userId)) {
    socket.emit('request-public-key', userId);
  }
}

  // Send message handler
  function sendMessage() {
    if (!currentChat) return;
    const message = messageInputRef.current.value.trim();
    if (!message) return;

    const userKey = userKeys.get(currentChat);
    if (!userKey) {
      alert("Recipient's public key not available");
      return;
    }

    // AES key for encrypting message
    const aesKey = CryptoJS.lib.WordArray.random(256 / 8).toString();

    const encryptedMessage = CryptoJS.AES.encrypt(message, aesKey).toString();

    // Encrypt AES key with recipient's public key
    const rsaEncrypt = new JSEncrypt();
    rsaEncrypt.setPublicKey(userKey.publicKey);
    const encryptedAESKey = rsaEncrypt.encrypt(aesKey);

    const timestamp = new Date().toISOString();
    const nonce = CryptoJS.lib.WordArray.random(128 / 8).toString();

    // Sign the message
    const rsaSign = new JSEncrypt();
    rsaSign.setPrivateKey(myKeys.privateKey);
    const signature = rsaSign.sign(message + timestamp + nonce, CryptoJS.SHA256, "sha256");

    socket.emit('send-message', {
      encryptedMessage,
      encryptedAESKey,
      timestamp,
      nonce,
      signature,
      targetUserId: currentChat
    });

    // Show sent message immediately
    const newMsg = {
      from: currentUserData.email,
      fromUsername: currentUserData.username,
      message,
      timestamp,
      verified: true,
      sent: true
    };
    setMessages((msgs) => [...msgs, newMsg]);
    messageInputRef.current.value = '';
  }

  // Decrypt incoming message and display
  function decryptAndDisplayMessage(data) {
    try {
      const rsaDecrypt = new JSEncrypt();
      rsaDecrypt.setPrivateKey(myKeys.privateKey);
      const aesKey = rsaDecrypt.decrypt(data.encryptedAESKey);
      if (!aesKey) return;

      const decryptedBytes = CryptoJS.AES.decrypt(data.encryptedMessage, aesKey);
      const message = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!message) return;

      // Verify signature
      let verified = false;
      if (data.signature) {
        const senderKey = userKeys.get(data.from);
        if (senderKey) {
          const rsaVerify = new JSEncrypt();
          rsaVerify.setPublicKey(senderKey.publicKey);
          verified = rsaVerify.verify(message + data.timestamp + data.nonce, data.signature, CryptoJS.SHA256);
        }
      }

      // Timestamp replay check
      const msgTime = new Date(data.timestamp).getTime();
      if (Math.abs(Date.now() - msgTime) > 300000) {
        console.warn('Message timestamp suspicious');
        return;
      }

      if (data.from === currentChat) {
        const newMsg = {
          from: data.from,
          fromUsername: data.fromUsername || data.from,
          message,
          timestamp: data.timestamp,
          verified,
          sent: false
        };
        setMessages((msgs) => [...msgs, newMsg]);
      }
    } catch (err) {
      console.error('Error decrypting message:', err);
    }
  }

  // Logout handler
  function logout() {
    const token = localStorage.getItem('authToken');
    fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).finally(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('username');
      window.location.href = '/';
    });
  }

  return (
    <div className="chat-app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="header" >
        <h1><FaShieldAlt /> SecureChat</h1>
        <div className="header-info" >
          <div className={`status ${connectionStatus === 'Connected' ? 'status-online' : 'status-offline'}`} >
            <div
              className={`status-dot ${connectionStatus === 'Connected' ? 'status-online' : 'status-offline'}`}
              
            />
            <span>{connectionStatus}</span>
          </div>
          <button onClick={logout} ><FaSignOutAlt /> Logout</button>
        </div>
      </header>

      {/* Main Container */}
      <div className="main-container" >

        {/* Sidebar */}
        <aside className="sidebar" >
          <div className="sidebar-header" >
            <div className="logged-user" >
              <div className="user-avatar" ><FaUserCircle size={36} /></div>
              <div className="user-details" >
                <div className="username">{currentUserData.username}</div>
                <div className="user-email">{currentUserData.email}</div>
              </div>
              <div className="online-indicator" />
            </div>
            <h3>Online Users</h3>
            <div className="encryption-status" >
              <FaKey /> {myKeys.publicKey ? 'Keys ready - Secure communication enabled' : 'Generating keys...'}
            </div>
          </div>

          <div className="users-list" >
            {allUsers.length === 0 && <div style={{ color: 'gray' }}>No users available</div>}
{allUsers.map((user) => {
  const isOnline = onlineUsers.some(u => u.userId === user._id); // user._id from DB, userId from socket
  const hasKey = userKeys.has(user._id);

  return (
    <div
      key={user._id}
      className={`user-item ${currentChat === user._id ? 'active' : ''}`}
      onClick={() => selectUser(user._id, user.username)}
    >
      <div className="user-info">
        <div className="user-name">{user.username}</div>
        <div className="user-status">{isOnline ? 'Online' : 'Offline'}</div>
      </div>
      <div
        className={`key-status ${hasKey ? 'key-available' : 'key-missing'}`}
      >
        {hasKey ? <FaLock /> : <FaUnlockAlt />}
        {hasKey ? 'Secure' : 'No Key'}
      </div>
    </div>
  );
})}

          </div>
        </aside>

        {/* Chat Container */}
        <section className="chat-container" >
          {!currentChat ? (
            <div
              id="chatArea"
              className="no-chat"
              
            >
              <FaComments size={48} style={{ marginBottom: 20 }} />
              <div>Select a user to start chatting</div>
            </div>
          ) : (
            <>
              <div className="chat-header" >
                <h3><FaUser /> {onlineUsers.find(u => u.userId === currentChat)?.username || currentChat}</h3>
                <div
                  className={`chat-encryption-status ${userKeys.has(currentChat) ? 'encrypted' : 'waiting'}`}
                  style={{ color: userKeys.has(currentChat) ? 'limegreen' : 'orange', fontWeight: 'bold' }}
                >
                  <FaShieldAlt /> {userKeys.has(currentChat) ? 'End-to-end encrypted' : 'Waiting for encryption keys...'}
                </div>
              </div>

              <div className="messages" id="messages" >
                {messages.map((msg, idx) => {
                  const time = new Date(msg.timestamp).toLocaleTimeString();
                  return (
                    <div
                      key={idx}
                      className={`message ${msg.sent ? 'message-sent' : 'message-received'}`}
                      
                    >
                      <div className="message-bubble" style={{ padding: '8px' }}>{msg.message}</div>
                      <div className="message-time" style={{ fontSize: '0.75rem', opacity: 0.7 }}>{time}</div>
                      <div className="message-status" style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {msg.verified ? <FaCheckCircle color="limegreen" /> : <FaExclamationTriangle color="tomato" />}
                        {msg.verified ? 'Verified' : 'Unverified'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="message-input" >
                <input
                  type="text"
                  id="messageInput"
                  placeholder="Type your message..."
                  disabled={!userKeys.has(currentChat)}
                  ref={messageInputRef}
                  onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                />
                <button
                  className="btn-send"
                  onClick={sendMessage}
                  disabled={!userKeys.has(currentChat)}
                 
                >
                  <FaPaperPlane />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}


