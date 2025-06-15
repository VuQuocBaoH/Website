import { Router } from 'express';
import { registerUser, loginUser, changePassword } from '../controllers/authController';
import authMiddleware from '../middleware/authMiddleware';
const router = Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.put('/change-password', authMiddleware, changePassword);

export default router;