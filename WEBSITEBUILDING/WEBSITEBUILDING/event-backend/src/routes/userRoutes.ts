// D:\code\DACNTT2\WEBSITEBUILDING\event-backend\src\routes\userRoutes.ts
import { Router } from 'express';
import {
  getUsersByIds,
  getCurrentUser,
  updateCurrentUserProfile,
  getUserPublicProfile,
  requestSpeaker,
  getPendingSpeakerRequests,
  approveSpeakerRequest,
  rejectSpeakerRequest,
  getSpeakerInvitations, 
  respondToSpeakerInvitation, 
} from '../controllers/userController';
import { authMiddleware, adminAuthMiddleware } from '../middleware/authMiddleware'; 

const router = Router();

// Existing routes
router.get('/details', authMiddleware, getUsersByIds);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/me', authMiddleware, updateCurrentUserProfile);
router.get('/:userId/profile', authMiddleware, getUserPublicProfile);

// @route   POST /api/users/request-speaker
// @desc    User requests to become a speaker
// @access  Private (User)
router.post('/request-speaker', authMiddleware, requestSpeaker);

// @route   GET /api/users/speaker-requests
// @desc    Admin gets all pending speaker requests
// @access  Private (Admin)
router.get('/speaker-requests', authMiddleware, adminAuthMiddleware, getPendingSpeakerRequests);

// @route   PUT /api/users/speaker-requests/:id/approve
// @desc    Admin approves a speaker request
// @access  Private (Admin)
router.put('/speaker-requests/:id/approve', authMiddleware, adminAuthMiddleware, approveSpeakerRequest);

// @route   PUT /api/users/speaker-requests/:id/reject
// @desc    Admin rejects a speaker request
// @access  Private (Admin)
router.put('/speaker-requests/:id/reject', authMiddleware, adminAuthMiddleware, rejectSpeakerRequest);

// @route   GET /api/users/me/speaker-invitations
// @desc    Get all speaker invitations for the logged-in user (speaker)
// @access  Private (Speaker)
router.get('/me/speaker-invitations', authMiddleware, getSpeakerInvitations); //

// @route   PUT /api/speaker-invitations/:invitationId/respond
// @desc    Speaker responds to an invitation (accept/decline)
// @access  Private (Speaker)
router.put('/speaker-invitations/:invitationId/respond', authMiddleware, respondToSpeakerInvitation); 


export default router;