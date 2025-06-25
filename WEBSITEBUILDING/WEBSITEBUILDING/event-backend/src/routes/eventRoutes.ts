// src/routes/eventRoutes.ts
import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getFeaturedEvents,
  getUpcomingEvents,
  getMyEvents,
  getEventsByOrganizer,
  purchaseTicket,
  getMyTickets,
  getEventTickets,
  checkInTicket,
  checkOutTicket,
  getEventStatistics,
  getApprovedSpeakers, 
  inviteSpeaker,
  getEventInvitations
} from '../controllers/eventController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/my-tickets', authMiddleware, getMyTickets);
router.get('/my-events', authMiddleware, getMyEvents);


router.get('/featured', getFeaturedEvents);
router.get('/upcoming', getUpcomingEvents);

router.get('/organizer/:organizerId', getEventsByOrganizer);

router.get('/:id/tickets', authMiddleware, getEventTickets);

router.get('/:eventId/statistics', authMiddleware, getEventStatistics); 


router.get('/speakers/approved', authMiddleware, getApprovedSpeakers); 
router.post('/:eventId/invite-speaker', authMiddleware, inviteSpeaker); 

router.get('/', getEvents);
router.get('/:id', getEventById);


router.post('/', authMiddleware, createEvent);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

router.post('/:id/register', authMiddleware, registerForEvent);
router.post('/:id/purchase-ticket', authMiddleware, purchaseTicket);
router.post('/:id/unregister', authMiddleware, unregisterFromEvent);
router.get('/:eventId/invitations', authMiddleware, getEventInvitations);
router.post('/tickets/check-in', authMiddleware, checkInTicket);
router.post('/tickets/check-out', authMiddleware, checkOutTicket);


export default router;