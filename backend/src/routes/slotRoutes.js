// slotRoutes.js - Routes for bookable time slots
import { Router } from 'express';
import { getSlots } from '../controllers/slotController.js';

const router = Router();

// GET /api/slots
router.get('/', getSlots);

export default router;
