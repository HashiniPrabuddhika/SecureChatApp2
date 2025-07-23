import React from 'react';
import { FaPaperPlane } from 'react-icons/fa';

export default function ChatInput({ message, setMessage, sendMessage, disabled }) {
  return (
    <div className="message-input">
      <input
        type="text"
        placeholder="Type your message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        disabled={disabled}
        onKeyPress={e => e.key === 'Enter' && !disabled && sendMessage()}
      />
      <button className="btn-send" onClick={sendMessage} disabled={disabled}>
        <FaPaperPlane />
      </button>
    </div>
  );
}