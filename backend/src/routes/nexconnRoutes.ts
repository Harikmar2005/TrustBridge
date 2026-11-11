import { Router } from 'express';
import { getStatus, getToken } from '../controllers/nexconnController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/status', getStatus);
router.post('/token', authenticateToken, getToken);

export default router;
