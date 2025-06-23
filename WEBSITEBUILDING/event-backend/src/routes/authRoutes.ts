// event-backend/src/routes/authRoutes.ts
import { Router } from 'express';
import { registerUser, loginUser, changePassword, forgotPassword, resetPassword } from '../controllers/authController'; 
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

// @route   PUT /api/auth/change-password
// @desc    Change user's password
// @access  Private
router.put('/change-password', authMiddleware, changePassword);

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset link
// @access  Public
router.post('/forgot-password', forgotPassword); 

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset user's password using the token
// @access  Public
router.put('/reset-password/:token', resetPassword); 

export default router;