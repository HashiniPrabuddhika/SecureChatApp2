import React from 'react';
import { FaUserCircle } from 'react-icons/fa';

export default function ProfilePage({ user }) {
  return (
    <div className="p-6 bg-white rounded shadow-md max-w-md mx-auto mt-10">
      <div className="flex flex-col items-center">
        <div className="user-avatar mb-4">
          <FaUserCircle size={60} />
        </div>
        <h2 className="text-xl font-semibold">{user.username}</h2>
        <p className="text-gray-600">{user.email}</p>
      </div>
    </div>
  );
}