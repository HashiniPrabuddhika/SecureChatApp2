import React, { useEffect, useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';

export default function ProfilePage({ user }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your profile.');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok) {
          setUser(data);
        } else {
          setError(data.error || 'Failed to fetch user data.');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      }
    };

    fetchUser();
  }, []);

  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>;

  if (!user) return <div className="text-center mt-10">Loading profile...</div>;

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