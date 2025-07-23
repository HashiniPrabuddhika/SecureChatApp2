import React from 'react';

export default function ContactsSidebar({ users, userKeys, selectUser, activeUserId }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Online Users</h3>
        <div id="keyStatus" className="encryption-status" style={{ marginTop: '10px' }}>
          <i className="fas fa-key"></i> Key status updated
        </div>
      </div>
      <div className="users-list" id="usersList">
        {users.map((user) => {
          const hasKey = userKeys.has(user.userId);
          return (
            <div
              key={user.userId}
              className={`user-item ${activeUserId === user.userId ? 'active' : ''}`}
              onClick={() => selectUser(user)}
            >
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-status">Online</div>
              </div>
              <div className={`key-status ${hasKey ? 'key-available' : 'key-missing'}`}>
                <i className={`fas fa-${hasKey ? 'lock' : 'unlock-alt'}`}></i>{' '}
                {hasKey ? 'Link with the connection' : 'No Key'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
