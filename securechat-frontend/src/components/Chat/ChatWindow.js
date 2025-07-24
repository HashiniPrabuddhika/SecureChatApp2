import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";
import "../css/chatwindow.css";

import {
  FaShieldAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaKey,
  FaLock,
  FaUnlockAlt,
  FaComments,
  FaUser,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userKeys, setUserKeys] = useState(new Map());
  const [currentChat, setCurrentChat] = useState(null);
  const [myKeys, setMyKeys] = useState({ privateKey: null, publicKey: null });
  const [currentUserData, setCurrentUserData] = useState({
    email: "",
    username: "",
  });
  const [messages, setMessages] = useState([]);
  const messageInputRef = useRef(null);

  // Load token & user info from localStorage
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const email = localStorage.getItem("userEmail");
    const username = localStorage.getItem("username");

    console.log("🔐 Loaded from localStorage:", { token, email, username });

    if (!token || !email) {
      console.warn("⚠️ Missing token or email. Redirecting to login...");
      window.location.href = "/";
      return;
    }

    setCurrentUserData({
      email,
      username: username || email.split("@")[0],
    });

    const socketClient = io({ auth: { token } });
    console.log("🔌 Connecting to socket.io...");

    setSocket(socketClient);

    return () => {
      console.log("🔌 Disconnecting socket...");
      socketClient.disconnect();
    };
  }, []);

  // Setup socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      setConnectionStatus("Connected");
      generateKeyPair();
      socket.emit("get-online-users");
    });

    socket.on("disconnect", () => {
      console.warn("🔌 Socket disconnected");
      setConnectionStatus("Disconnected");
    });

    socket.on("online-users", (users) => {
      console.log("👥 Online users received:", users);
      setOnlineUsers(users);
    });

    socket.on("user-key-available", (data) => {
      console.log("📥 Received user-key-available:", data);
      setUserKeys((prev) => new Map(prev).set(data.userId, data));
      socket.emit("get-online-users");
    });

    socket.on("receive-public-key", (data) => {
      console.log("🔑 Received public key:", data);
      setUserKeys((prev) => new Map(prev).set(data.userId, data));
    });

    socket.on("receive-message", (data) => {
      console.log("📨 Incoming encrypted message:", data);
      decryptAndDisplayMessage(data);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  }, [socket]);

  // Generate RSA key pair
  function generateKeyPair() {
    console.log("🔐 Generating RSA key pair...");
    const crypt = new JSEncrypt({ default_key_size: 1024 });
    const privateKey = crypt.getPrivateKey();
    const publicKey = crypt.getPublicKey();
    setMyKeys({ privateKey, publicKey });

    console.log("✅ Keys generated. Uploading public key...");
    socket.emit("upload-public-key", {
      publicKey,
      keyType: "RSA",
    });
  }

  function selectUser(userId, username) {
    console.log("📤 Chatting with:", { userId, username });
    setCurrentChat(userId);
    setMessages([]);

    if (!userKeys.has(userId)) {
      console.log("🔑 Requesting public key for", userId);
      socket.emit("request-public-key", userId);
    }
  }

  function sendMessage() {
    if (!currentChat) return;
    const message = messageInputRef.current.value.trim();
    if (!message) return;

    const userKey = userKeys.get(currentChat);
    if (!userKey) {
      alert("Recipient's public key not available");
      return;
    }

    const aesKey = CryptoJS.lib.WordArray.random(256 / 8).toString();
    const encryptedMessage = CryptoJS.AES.encrypt(message, aesKey).toString();

    const rsaEncrypt = new JSEncrypt();
    rsaEncrypt.setPublicKey(userKey.publicKey);
    const encryptedAESKey = rsaEncrypt.encrypt(aesKey);

    const timestamp = new Date().toISOString();
    const nonce = CryptoJS.lib.WordArray.random(128 / 8).toString();

    const rsaSign = new JSEncrypt();
    rsaSign.setPrivateKey(myKeys.privateKey);
    const signature = rsaSign.sign(
      message + timestamp + nonce,
      CryptoJS.SHA256,
      "sha256"
    );

    const payload = {
      encryptedMessage,
      encryptedAESKey,
      timestamp,
      nonce,
      signature,
      targetUserId: currentChat,
    };

    console.log("📤 Sending encrypted message:", payload);
    socket.emit("send-message", payload);

    const newMsg = {
      from: currentUserData.email,
      fromUsername: currentUserData.username,
      message,
      timestamp,
      verified: true,
      sent: true,
    };
    setMessages((msgs) => [...msgs, newMsg]);
    messageInputRef.current.value = "";
  }

  function decryptAndDisplayMessage(data) {
    try {
      const rsaDecrypt = new JSEncrypt();
      rsaDecrypt.setPrivateKey(myKeys.privateKey);
      const aesKey = rsaDecrypt.decrypt(data.encryptedAESKey);

      if (!aesKey) {
        console.warn("❌ Failed to decrypt AES key");
        return;
      }

      const decryptedBytes = CryptoJS.AES.decrypt(
        data.encryptedMessage,
        aesKey
      );
      const message = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!message) {
        console.warn("❌ Failed to decrypt message content");
        return;
      }

      let verified = false;
      if (data.signature) {
        const senderKey = userKeys.get(data.from);
        if (senderKey) {
          const rsaVerify = new JSEncrypt();
          rsaVerify.setPublicKey(senderKey.publicKey);
          verified = rsaVerify.verify(
            message + data.timestamp + data.nonce,
            data.signature,
            CryptoJS.SHA256
          );
        }
      }

      const msgTime = new Date(data.timestamp).getTime();
      if (Math.abs(Date.now() - msgTime) > 300000) {
        console.warn("⏳ Message timestamp suspicious, possible replay attack");
        return;
      }

      if (data.from === currentChat) {
        console.log("📩 Decrypted message:", message);
        const newMsg = {
          from: data.from,
          fromUsername: data.fromUsername || data.from,
          message,
          timestamp: data.timestamp,
          verified,
          sent: false,
        };
        setMessages((msgs) => [...msgs, newMsg]);
      }
    } catch (err) {
      console.error("❌ Error decrypting message:", err);
    }
  }

  function logout() {
    const token = localStorage.getItem("authToken");
    console.log("🚪 Logging out user...");
    fetch("/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).finally(() => {
      localStorage.clear();
      window.location.href = "/";
    });
  }




  return (
    <div
      className="chat-app"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <header className="header">
        <h1>
          <FaShieldAlt /> SecureChat
        </h1>
        <div className="header-info">
          <div
            className={`status ${
              connectionStatus === "Connected"
                ? "status-online"
                : "status-offline"
            }`}
          >
            <div
              className={`status-dot ${
                connectionStatus === "Connected"
                  ? "status-online"
                  : "status-offline"
              }`}
            />
            <span>{connectionStatus}</span>
          </div>
          <button onClick={logout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logged-user">
              <div className="user-avatar">
                <FaUserCircle size={36} />
              </div>
              <div className="user-details">
                <div className="username">{currentUserData.username}</div>
                <div className="user-email">{currentUserData.email}</div>
              </div>
              <div className="online-indicator" />
            </div>
            <h3>Online Users</h3>
            <div className="encryption-status">
              <FaKey />{" "}
              {myKeys.publicKey
                ? "Keys ready - Secure communication enabled"
                : "Generating keys..."}
            </div>
          </div>

          <div className="users-list">
            {onlineUsers.length === 0 && (
              <div style={{ color: "gray" }}>No users online</div>
            )}
            {onlineUsers.map((user) => {
              const hasKey = user.hasPublicKey || userKeys.has(user.userId);
              return (
                <div
                  key={user.userId}
                  className={`user-item ${
                    currentChat === user.userId ? "active" : ""
                  }`}
                  onClick={() => selectUser(user.userId, user.username)}
                >
                  <div className="user-info">
                    <div className="user-name">
                      {user.username || user.userId.split("@")[0]}
                    </div>
                    <div className="user-status">Online</div>
                  </div>
                  <div
                    className={`key-status ${
                      hasKey ? "key-available" : "key-missing"
                    }`}
                  >
                    {hasKey ? <FaLock /> : <FaUnlockAlt />}
                    {hasKey ? "Link with the connection" : "No Key"}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Chat Container */}
        <section className="chat-container">
          {!currentChat ? (
            <div id="chatArea" className="no-chat">
              <FaComments size={48} style={{ marginBottom: 20 }} />
              <div>Select a user to start chatting</div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <h3>
                  <FaUser />{" "}
                  {onlineUsers.find((u) => u.userId === currentChat)
                    ?.username || currentChat}
                </h3>
                <div
                  className={`chat-encryption-status ${
                    userKeys.has(currentChat) ? "encrypted" : "waiting"
                  }`}
                  style={{
                    color: userKeys.has(currentChat) ? "limegreen" : "orange",
                    fontWeight: "bold",
                  }}
                >
                  <FaShieldAlt />{" "}
                  {userKeys.has(currentChat)
                    ? "End-to-end encrypted"
                    : "Waiting for encryption keys..."}
                </div>
              </div>

              <div className="messages" id="messages">
                {messages.map((msg, idx) => {
                  const time = new Date(msg.timestamp).toLocaleTimeString();
                  return (
                    <div
                      key={idx}
                      className={`message ${
                        msg.sent ? "message-sent" : "message-received"
                      }`}
                    >
                      <div
                        className="message-bubble"
                        style={{ padding: "8px" }}
                      >
                        {msg.message}
                      </div>
                      <div
                        className="message-time"
                        style={{ fontSize: "0.75rem", opacity: 0.7 }}
                      >
                        {time}
                      </div>
                      <div
                        className="message-status"
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.7,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {msg.verified ? (
                          <FaCheckCircle color="limegreen" />
                        ) : (
                          <FaExclamationTriangle color="tomato" />
                        )}
                        {msg.verified ? "Verified" : "Unverified"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="message-input">
                <input
                  type="text"
                  id="messageInput"
                  placeholder="Type your message..."
                  disabled={!userKeys.has(currentChat)}
                  ref={messageInputRef}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
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
