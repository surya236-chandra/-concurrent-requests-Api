// siteRoutes.js - Routes for sites
import { Router } from 'express';
import { getSites } from '../controllers/siteController.js';

const router = Router();

// GET /api/sites
router.get('/', getSites);

export default router;
