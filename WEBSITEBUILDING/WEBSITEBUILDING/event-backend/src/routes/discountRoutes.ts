// D:\code\DACNTT2\event-backend\src\routes\discountRoutes.ts

import { Router } from 'express';
import {
  createDiscountCode,
  getAllDiscountCodes,
  getDiscountCodeByCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode
} from '../controllers/discountController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/validate', authMiddleware, validateDiscountCode);
// END CHANGE

// Routes yêu cầu quyền admin
router.post('/', authMiddleware, createDiscountCode); // Tạo mã
router.get('/', authMiddleware, getAllDiscountCodes); // Lấy tất cả mã
router.put('/:id', authMiddleware, updateDiscountCode); // Cập nhật mã
router.delete('/:id', authMiddleware, deleteDiscountCode); // Xóa mã


router.get('/:code', authMiddleware, getDiscountCodeByCode); 

export default router;