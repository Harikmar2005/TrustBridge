import { Router } from 'express';
import {
  getTickets,
  getFraudAlerts,
  updateFraudAlertStatus,
  getAuditLogs,
} from '../controllers/supportController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/tickets', authenticateToken, getTickets);
router.get('/fraud-alerts', authenticateToken, requireRoles(['support', 'admin']), getFraudAlerts);
router.post('/fraud-alerts/:id/status', authenticateToken, requireRoles(['support', 'admin']), updateFraudAlertStatus);
router.get('/audit-logs', authenticateToken, requireRoles(['admin']), getAuditLogs);

export default router;
