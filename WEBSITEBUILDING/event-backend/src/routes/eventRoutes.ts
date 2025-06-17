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
} from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware'; 

const router = Router();

router.get('/', getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/upcoming', getUpcomingEvents);
router.get('/my-events', authMiddleware, getMyEvents); 
router.get('/organizer/:organizerId', getEventsByOrganizer);
router.get('/:id', getEventById);
router.post('/', authMiddleware, createEvent);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);
router.post('/:id/register', authMiddleware, registerForEvent);
router.post('/:id/unregister', authMiddleware, unregisterFromEvent);

export default router;