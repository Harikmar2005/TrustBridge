import { Router } from 'express';
import { getMetrics } from '../controllers/adminController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/metrics', authenticateToken, requireRoles(['admin', 'support']), getMetrics);

export default router;
