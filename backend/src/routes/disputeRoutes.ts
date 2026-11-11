import { Router } from 'express';
import {
  getDisputes,
  getDisputeById,
  createDispute,
  resolveDispute,
} from '../controllers/disputeController';
import {
  authenticateToken,
  requireDisputeAccess,
  requireRoles,
} from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getDisputes);
router.get('/:id', authenticateToken, requireDisputeAccess, getDisputeById);
router.post('/create', authenticateToken, createDispute);
router.post('/:id/resolve', authenticateToken, requireRoles(['support', 'admin']), resolveDispute);

export default router;
