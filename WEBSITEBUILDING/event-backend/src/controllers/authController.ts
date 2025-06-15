import { Request, Response, RequestHandler  } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // Import User model

// Register a new user
export const registerUser: RequestHandler = async (req, res): Promise<void> => {
  const { username, email, password } = req.body;

   try {
    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ msg: 'User already exists' });
      return;
    }

    user = new User({
      username,
      email,
      passwordHash: password,
      role: 'user', // Mặc định là user khi đăng ký
    });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role, // Đảm bảo role được thêm vào payload
      },
    };

    jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
    (err, token) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Token generation failed');
        return;
      }
      // TRẢ VỀ user.role VÀO OBJECT TRẢ VỀ CHO FRONTEND
      res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
      }
    );

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Authenticate user & get token (Login)
export const loginUser: RequestHandler = async (req, res): Promise<void> => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ msg: 'Invalid Credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ msg: 'Invalid Credentials' });
      return
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role, // Đảm bảo role được thêm vào payload
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        // TRẢ VỀ user.role VÀO OBJECT TRẢ VỀ CHO FRONTEND
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
      }
    );

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   PUT /api/auth/change-password
// @desc    Change user's password
// @access  Private
export const changePassword: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ msg: 'User not authenticated' });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ msg: 'Cần cung cấp mật khẩu hiện tại và mật khẩu mới.' });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ msg: 'Người dùng không tồn tại.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ msg: 'Mật khẩu hiện tại không đúng.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date();

    await user.save();
    res.json({ msg: 'Mật khẩu đã được thay đổi thành công!' });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};