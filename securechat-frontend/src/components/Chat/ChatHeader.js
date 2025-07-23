import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';

export default function ChatHeader({ displayUsername, isEncrypted }) {
  return (
    <div className="chat-header">
      <h3><FaShieldAlt /> {displayUsername}</h3>
      <div className={`chat-encryption-status ${isEncrypted ? 'encrypted' : 'waiting'}`}>
        <FaShieldAlt />
        {isEncrypted ? 'End-to-end encrypted' : 'Waiting for encryption keys...'}
      </div>
    </div>
  );
}