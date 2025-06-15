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
  getUpcomingEvents
} from '../controllers/eventController';
import authMiddleware from '../middleware/authMiddleware'; // Import authentication middleware (sẽ tạo sau)

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/featured', getFeaturedEvents); // For Index.tsx
router.get('/upcoming', getUpcomingEvents); // For Index.tsx
router.get('/:id', getEventById);

// Private routes (cần xác thực JWT)
router.post('/', authMiddleware, createEvent); // authMiddleware sẽ bảo vệ route này
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);
router.post('/:id/register', authMiddleware, registerForEvent);
router.post('/:id/unregister', authMiddleware, unregisterFromEvent);

export default router;