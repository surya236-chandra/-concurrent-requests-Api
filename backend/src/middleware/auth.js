// auth.js - two middleware functions used on protected routes
//
// requireAuth  → checks the JWT is valid, puts the user payload on req.user
// requireAdmin → goes AFTER requireAuth, checks the role is 'admin'

import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  // JWT is sent as:  Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // grab the part after "Bearer "

  try {
    // SECURITY: we MUST pin the algorithm to HS256.
    // Without { algorithms: ['HS256'] }, an attacker could craft a token
    // with alg:"none" and no signature — and older JWT libs would accept it.
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // Attach the decoded payload to req so downstream handlers can use it.
    // payload contains: { userId, email, role, iat, exp }
    req.user = payload;
    next();
  } catch (err) {
    // jwt.verify throws if the token is expired, tampered, or wrong algorithm
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// requireAdmin must always come AFTER requireAuth in the middleware chain.
// requireAuth guarantees req.user exists before we reach this function.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
