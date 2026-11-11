import { Router } from 'express';
import {
  getUsers,
  getUserProfile,
  updateUserLanguage,
} from '../controllers/userController';

const router = Router();

router.get('/', getUsers);
router.get('/:id/profile', getUserProfile);
router.patch('/:id/language', updateUserLanguage);

export default router;
