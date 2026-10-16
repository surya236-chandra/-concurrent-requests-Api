// adminRoutes.js - Admin-only routes
import { Router } from 'express';
import { getAdminCapacity } from '../controllers/reservationController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/capacity
router.get('/capacity', requireAuth, requireAdmin, getAdminCapacity);

export default router;
