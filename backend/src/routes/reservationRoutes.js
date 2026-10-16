// reservationRoutes.js - Routes for booking and cancellations
import { Router } from 'express';
import { z } from 'zod';
import {
  createReservation,
  cancelReservation,
  getMyReservations,
} from '../controllers/reservationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const reservationSchema = z.object({
  slotId: z.string().min(1, 'slotId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 tickets per booking'),
});

// All reservation operations require authentication
router.post('/', requireAuth, validate(reservationSchema), createReservation);
router.delete('/:id', requireAuth, cancelReservation);
router.get('/me', requireAuth, getMyReservations);

export default router;
