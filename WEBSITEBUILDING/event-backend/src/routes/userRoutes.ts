import { Router } from 'express';
import { getUsersByIds, getCurrentUser, updateCurrentUserProfile } from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.get('/details', authMiddleware, getUsersByIds);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/me', authMiddleware, updateCurrentUserProfile);

export default router;


