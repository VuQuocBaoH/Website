import { Request, Response, RequestHandler } from 'express';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
// @route   GET /api/users/details
// @desc    Get details of multiple users by IDs (for organizers/admins)
// @access  Private (only accessible by authenticated users, role check will be done by caller)
export const getUsersByIds: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userIds = req.query.ids; // Nhận danh sách IDs từ query params, ví dụ: ?ids=id1,id2,id3

    if (!userIds || typeof userIds !== 'string') {
      res.status(400).json({ msg: 'User IDs are required' });
      return;
    }

    // Chuyển chuỗi IDs thành mảng các ObjectId
    const userObjectIds = userIds.split(',').map(id => new mongoose.Types.ObjectId(id));

    const users = await User.find({ _id: { $in: userObjectIds } }).select('username email'); // Chỉ lấy username và email
    res.json(users);
  } catch (err: any) {
    console.error(err.message);
    // Xử lý lỗi nếu IDs không hợp lệ
    if (err.kind === 'ObjectId') {
        res.status(400).json({ msg: 'Invalid user ID format' });
        return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/users/me
// @desc    Get current logged in user
// @access  Private
export const getCurrentUser: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ msg: 'User not authenticated' });
    return;
  }
  try {
    const user = await User.findById(userId).select('-passwordHash'); // Trừ trường passwordHash
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/users/me
// @desc    Update current user's profile (username, email)
// @access  Private
export const updateCurrentUserProfile: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ msg: 'User not authenticated' });
    return;
  }
  const { username, email } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    // Kiểm tra email trùng lặp nếu email mới khác email cũ
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.id !== userId) {
        res.status(400).json({ msg: 'Email already in use' });
        return;
      }
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.updatedAt = new Date(); // Cập nhật thời gian thay đổi

    await user.save();
    res.json({ msg: 'Profile updated successfully', user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getUserPublicProfile: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('-password -email');

    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return; 
    }

    res.json(user);
    
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'User not found' });
        return; 
    }
    res.status(500).send('Server Error');
  }
};