import { Router } from 'express';
import {
  analyzeMessage,
  analyzeUrl,
  getAnalysisById,
  getStats,
  getModels,
} from '../controllers/fraudController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/analyze', authenticateToken, analyzeMessage);
router.post('/analyze-url', authenticateToken, analyzeUrl);
router.get('/analysis/:id', authenticateToken, getAnalysisById);
router.get('/stats', authenticateToken, getStats);
router.get('/models', authenticateToken, getModels);

export default router;
