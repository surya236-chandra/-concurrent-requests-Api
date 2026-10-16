// authController.js - Handles user registration, login, and profile check
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// POST /api/auth/register
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password with salt rounds = 10
    const passwordHash = await bcrypt.hash(password, 10);

    // SECURITY: Role is ALWAYS hardcoded to 'user'.
    // Client cannot escalate privilege by passing { role: 'admin' }.
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Use generic error message so we don't leak whether the email exists
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT with payload, secret from env, HS256 algorithm, and 1h expiration
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '1h',
      }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
}

// GET /api/auth/me (Protected route test)
export async function getMe(req, res) {
  // req.user was attached by requireAuth middleware
  return res.status(200).json({ user: req.user });
}
