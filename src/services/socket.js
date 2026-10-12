import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { getToken } from './storage';
import authEvents, { AUTH_EVENTS } from './authEvents';

let socket = null;
let reconnectTimer = null;

/**
 * Connect to Socket.IO server with JWT authentication.
 * The server validates the token before allowing the connection.
 * Handles token expiry by emitting auth events (replaces global.authExpired).
 */
const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await getToken();
  if (!token) return null;

  // Disconnect existing socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token }, // Server validates this JWT token
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    forceNew: true,
  });

  // Handle authentication errors from server
  socket.on('connect_error', async (err) => {
    const authErrors = [
      'Authentication required',
      'Token expired',
      'Invalid token',
      'Authentication failed',
      'User not found',
      'Account is deactivated',
    ];

    if (authErrors.includes(err.message)) {
      // Token is invalid/expired - stop reconnection and emit auth event
      socket.disconnect();
      socket = null;

      // Use EventEmitter instead of global variable for instant, reliable notification
      if (err.message === 'Account is deactivated') {
        authEvents.emit(AUTH_EVENTS.ACCOUNT_DEACTIVATED);
      } else {
        authEvents.emit(AUTH_EVENTS.TOKEN_EXPIRED);
      }
    }
  });

  // Handle successful reconnection - re-authenticate with fresh token
  socket.on('reconnect', async () => {
    const freshToken = await getToken();
    if (freshToken) {
      socket.auth = { token: freshToken };
    }
  });

  return socket;
};

/**
 * Disconnect from Socket.IO server and clean up all listeners.
 */
const disconnectSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance (may be null if not connected).
 */
const getSocket = () => socket;

export { connectSocket, disconnectSocket, getSocket };