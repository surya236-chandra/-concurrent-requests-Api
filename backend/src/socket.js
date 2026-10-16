// socket.js - Real-time capacity updates using Socket.io
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

// Initialize Socket.io on the shared HTTP server
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow frontend dev server
      methods: ['GET', 'POST'],
    },
  });

  // JWT Authentication middleware for Socket.io connection handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      // Pin algorithm to HS256 for security
      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
      // Attach verified user payload to the socket instance
      socket.user = payload;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // If user is an admin, automatically join the 'admin' broadcast room
    if (socket.user?.role === 'admin') {
      socket.join('admin');
    }

    // Client requests to join a room for a specific slot to receive live capacity updates
    socket.on('joinSlot', (slotId) => {
      if (slotId) {
        socket.join(`slot:${slotId}`);
      }
    });

    // Client leaves a slot room (e.g., when switching dates or sites)
    socket.on('leaveSlot', (slotId) => {
      if (slotId) {
        socket.leave(`slot:${slotId}`);
      }
    });
  });

  return io;
}

// Helper to broadcast capacity updates after a booking or cancellation commits.
// RULE: Must only be called AFTER session.commitTransaction() succeeds.
export function emitCapacityUpdate(slotId, availableTickets) {
  if (!io) return;

  // Broadcast to users watching this specific slot room AND the admin dashboard room
  io.to(`slot:${slotId}`)
    .to('admin')
    .emit('capacity:update', {
      slotId: String(slotId),
      availableTickets,
    });
}
