// app.js - the entry point for the backend
// Loads env vars, connects to DB, sets up Express and Socket.io, starts the server

// Must be the very first import so every other file can read process.env
import 'dotenv/config';

import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedIfEmpty } from '../scripts/seed.js';
import { initSocket } from './socket.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Create HTTP server so Express and Socket.io share the exact same port
const server = http.createServer(app);

// Initialize Socket.io real-time engine
initSocket(server);

// Security headers via Helmet (hides X-Powered-By, adds X-Content-Type-Options, etc.)
app.use(helmet());

// Enable CORS for frontend requests
app.use(cors());

// Parse incoming JSON bodies so req.body works
app.use(express.json());

// --- Routes ---
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for any route we haven't defined yet
// Useful during development to see typos in URLs
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Start ---
// We connect to DB first, seed if empty, then start listening on the HTTP server.
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    await seedIfEmpty(); // only runs if collections are empty
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1); // Exit with error code so Docker/PM2 can restart us
  }
}

start();
