// D:\code\DACNTT2\event-backend\src\controllers\discountController.ts

import { Request, Response, RequestHandler } from 'express';
import DiscountCode, { IDiscountCode } from '../models/DiscountCode';
import mongoose from 'mongoose';

// @route   POST /api/discounts
// @desc    Create a new discount code
// @access  Private (Admin only)
export const createDiscountCode: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== 'admin') {
    res.status(403).json({ msg: 'Not authorized to create discount codes' });
    return;
  }

  const { code, value, type, expirationDate, usageLimit, isActive } = req.body;

  try {
    const existingCode = await DiscountCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      res.status(400).json({ msg: 'Discount code already exists' });
      return;
    }

    const newCode = new DiscountCode({
      code: code.toUpperCase(), // Lưu dưới dạng chữ hoa
      value,
      type,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      isActive: isActive !== undefined ? isActive : true, // Mặc định là true
      usageLimit,
      createdBy: new mongoose.Types.ObjectId(userId),
    }) as IDiscountCode;

    await newCode.save();
    res.status(201).json(newCode);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/discounts
// @desc    Get all discount codes
// @access  Private (Admin only)
export const getAllDiscountCodes: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== 'admin') {
    res.status(403).json({ msg: 'Not authorized to view discount codes' });
    return;
  }

  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/discounts/:code
// @desc    Get a single discount code by code (for validation)
// @access  Private (Or public for frontend validation?) -> For now, private
export const getDiscountCodeByCode: RequestHandler = async (req, res): Promise<void> => {
    // Để cho phép frontend validate, ta có thể bỏ authMiddleware ở route này,
    // nhưng vẫn phải có logic validate code (hạn, giới hạn sử dụng)
    const userId = req.user?.id; // vẫn cần user để biết người nào validate
    if (!userId) {
        res.status(401).json({ msg: 'Authentication required to validate code' });
        return;
    }

    try {
        const code = req.params.code.toUpperCase();
        const discountCode = await DiscountCode.findOne({ code });

        if (!discountCode || !discountCode.isActive) {
            res.status(404).json({ msg: 'Invalid or inactive discount code' });
            return;
        }
        // Kiểm tra hết hạn
        if (discountCode.expirationDate && discountCode.expirationDate < new Date()) {
            res.status(400).json({ msg: 'Discount code has expired' });
            return;
        }
        // Kiểm tra giới hạn sử dụng
        if (discountCode.usageLimit && discountCode.timesUsed >= discountCode.usageLimit) {
            res.status(400).json({ msg: 'Discount code usage limit reached' });
            return;
        }

        res.json(discountCode);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// START CHANGE: Thêm hàm mới để validate mã giảm giá
// @route   POST /api/discounts/validate
// @desc    Validate a discount code
// @access  Private (User must be logged in)
export const validateDiscountCode: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ valid: false, message: 'Vui lòng nhập mã giảm giá.' });
      return;
    }

    const discountCode = await DiscountCode.findOne({ code: code.toUpperCase() });

    if (!discountCode || !discountCode.isActive) {
      res.status(404).json({ valid: false, message: 'Mã giảm giá không hợp lệ hoặc không hoạt động.' });
      return; 
    }

    if (discountCode.expirationDate && discountCode.expirationDate < new Date()) {
      res.status(400).json({ valid: false, message: 'Mã giảm giá đã hết hạn.' });
      return; 
    }

    if (discountCode.usageLimit && discountCode.timesUsed >= discountCode.usageLimit) {
      res.status(400).json({ valid: false, message: 'Mã giảm giá đã hết lượt sử dụng.' });
      return;
    }

    // Nếu tất cả kiểm tra đều qua, trả về thông tin hợp lệ
    res.json({
      valid: true,
      code: discountCode.code,
      value: discountCode.value,
      type: discountCode.type,
      message: 'Áp dụng mã giảm giá thành công!',
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ valid: false, message: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
};

// @route   PUT /api/discounts/:id
// @desc    Update a discount code
// @access  Private (Admin only)
export const updateDiscountCode: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== 'admin') {
    res.status(403).json({ msg: 'Not authorized to update discount codes' });
    return;
  }

  const { code, value, type, expirationDate, usageLimit, isActive } = req.body;
  const updatedData: Partial<IDiscountCode> = {
    code: code ? code.toUpperCase() : undefined,
    value,
    type,
    expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    usageLimit,
    isActive,
    updatedAt: new Date(), // Cập nhật thời gian sửa
  };

  try {
    const discountCode = await DiscountCode.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!discountCode) {
      res.status(404).json({ msg: 'Discount code not found' });
      return;
    }
    res.json(discountCode);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE /api/discounts/:id
// @desc    Delete a discount code
// @access  Private (Admin only)
export const deleteDiscountCode: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== 'admin') {
    res.status(403).json({ msg: 'Not authorized to delete discount codes' });
    return;
  }

  try {
    const discountCode = await DiscountCode.findByIdAndDelete(req.params.id);
    if (!discountCode) {
      res.status(404).json({ msg: 'Discount code not found' });
      return;
    }
    res.json({ msg: 'Discount code removed' });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};