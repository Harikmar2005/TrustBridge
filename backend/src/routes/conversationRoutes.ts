import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  markRead,
  reportFalsePositive,
} from '../controllers/conversationController';
import { authenticateToken, requireConversationAccess } from '../middleware/auth';
import { messageLimiter } from '../config/security';

const router = Router();

// Conversation routes
router.get('/conversations', authenticateToken, getConversations);
router.get('/conversations/:id/messages', authenticateToken, requireConversationAccess, getMessages);

// Message routes
router.post('/messages/send', messageLimiter, authenticateToken, requireConversationAccess, sendMessage);
router.patch('/messages/:id/read', markRead);
router.post('/messages/:id/false-positive', reportFalsePositive);

export default router;
