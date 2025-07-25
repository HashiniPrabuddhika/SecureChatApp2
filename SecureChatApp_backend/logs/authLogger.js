const fs = require('fs');
const path = require('path');

// Log file path
const logFilePath = path.join(__dirname, 'auth.log');

/**
 * Logs an authentication event to a file with timestamp, userId, event type, and IP.
 * 
 * @param {string|object} userId - User ID or 'unknown' for unidentified users
 * @param {string} event - Event description, e.g. 'Login Success', 'Login Failure'
 * @param {string} ip - IP address of the client making the request
 */
function logAuthEvent(userId, event, ip) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | User: ${userId} | Event: ${event} | IP: ${ip}\n`;

  // Append the log entry to the file asynchronously
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write auth log:', err);
    }
  });
}

module.exports = logAuthEvent;
