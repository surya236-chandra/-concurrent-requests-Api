// hooks/useSocket.js - Custom React hook for authenticated Socket.io connection with stable callbacks
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export function useSocket(onCapacityUpdate) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const callbackRef = useRef(onCapacityUpdate);

  // Keep callback reference updated without triggering socket reconnections
  useEffect(() => {
    callbackRef.current = onCapacityUpdate;
  }, [onCapacityUpdate]);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

    // Establish WebSocket connection with JWT in handshake
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('capacity:update', (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const joinSlot = useCallback((slotId) => {
    if (socketRef.current && slotId) {
      socketRef.current.emit('joinSlot', slotId);
    }
  }, []);

  const leaveSlot = useCallback((slotId) => {
    if (socketRef.current && slotId) {
      socketRef.current.emit('leaveSlot', slotId);
    }
  }, []);

  return { socket: socketRef.current, joinSlot, leaveSlot };
}
