import { io } from 'socket.io-client';

const SOCKET_IO_URL = process.env.REACT_APP_SOCKET_IO_URL;

const socket = io(SOCKET_IO_URL, {
  auth: {
    token: localStorage.getItem('authToken'), // pass JWT token for authentication
  },
});

socket.on('connect', () => {
  console.log('Connected to socket server');
});
