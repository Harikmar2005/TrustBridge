import { Router } from 'express';
import {
  login,
  register,
  switchDemoUser,
  logout,
  getMe,
} from '../controllers/authController';
import { authLimiter } from '../config/security';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/switch-demo-user', switchDemoUser);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
