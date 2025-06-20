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
  getEventTickets 
} from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.get('/my-tickets', authMiddleware, getMyTickets); 
router.get('/my-events', authMiddleware, getMyEvents);


router.get('/featured', getFeaturedEvents);
router.get('/upcoming', getUpcomingEvents);

router.get('/organizer/:organizerId', getEventsByOrganizer);

router.get('/:id/tickets', authMiddleware, getEventTickets); 

router.get('/', getEvents);

router.get('/:id', getEventById);


router.post('/', authMiddleware, createEvent);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

router.post('/:id/register', authMiddleware, registerForEvent);
router.post('/:id/purchase-ticket', authMiddleware, purchaseTicket);
router.post('/:id/unregister', authMiddleware, unregisterFromEvent);


export default router;