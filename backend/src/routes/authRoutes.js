// authRoutes.js - Authentication routes with rate limiter and Zod validation
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { register, login, getMe } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Rate limiter: prevent brute-force attacks on login and registration
// Max 10 requests per 15-minute window per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Protected test routes to verify requireAuth and requireAdmin
router.get('/me', requireAuth, getMe);
router.get('/admin-check', requireAuth, requireAdmin, (req, res) => {
  res.json({ message: 'Welcome Admin!', user: req.user });
});

export default router;
