// healthRoutes.js - simple ping route to verify the server is up
// Useful for Docker healthchecks and manual "is the API alive?" tests

import { Router } from 'express';

const router = Router();

// GET /api/health
// Returns 200 + timestamp. No auth needed - just for diagnostics.
router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
