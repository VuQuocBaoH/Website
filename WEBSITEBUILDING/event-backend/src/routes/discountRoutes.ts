// D:\code\DACNTT2\event-backend\src\routes\discountRoutes.ts

import { Router } from 'express';
import {
  createDiscountCode,
  getAllDiscountCodes,
  getDiscountCodeByCode,
  updateDiscountCode,
  deleteDiscountCode
} from '../controllers/discountController';
import authMiddleware from '../middleware/authMiddleware'; // Dùng để bảo vệ routes

const router = Router();

// Routes yêu cầu quyền admin
router.post('/', authMiddleware, createDiscountCode); // Tạo mã
router.get('/', authMiddleware, getAllDiscountCodes); // Lấy tất cả mã
router.put('/:id', authMiddleware, updateDiscountCode); // Cập nhật mã
router.delete('/:id', authMiddleware, deleteDiscountCode); // Xóa mã

// Route để validate mã (có thể là Public hoặc Private tùy vào cách sử dụng)
// Tạm thời để Private, yêu cầu token, nhưng không yêu cầu admin role
router.get('/:code', authMiddleware, getDiscountCodeByCode); // Lấy mã theo code để validate

export default router;