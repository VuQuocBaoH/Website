// event-backend/src/controllers/authController.ts
import { Request, Response, RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Import crypto module
import User, { IUser } from '../models/User';
import nodemailer from 'nodemailer'; // Import nodemailer
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST, 
//   port: parseInt(process.env.EMAIL_PORT || '587'), 
//   secure: process.env.EMAIL_SECURE === 'true', 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false 
//   }
// });

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'admin';
  };
}

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

// @route   POST /api/auth/forgot-password
// @desc    Request a password reset
// @access  Public
export const forgotPassword: RequestHandler = async (req, res): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ msg: 'Vui lòng cung cấp email.' });
    return;
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Trả về thông báo thành công chung chung để tránh tiết lộ email
      res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi đến bạn.' });
      return;
    }

    // Tạo token đặt lại mật khẩu
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 3600000); // Token hết hạn sau 1 giờ

    await user.save();

    // Tạo URL đặt lại mật khẩu cho frontend
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu của bạn',
      html: `
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p>
        <a href="${resetURL}">Đặt lại mật khẩu của tôi</a>
        <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Lỗi gửi email:', error);
        // Có thể muốn đặt lại token nếu gửi email thất bại nghiêm trọng
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.save();
        return res.status(500).json({ msg: 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.' });
      }
      console.log('Email đã gửi:', info.response);
      res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi đến bạn.' });
    });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset user's password using the token
// @access  Public
export const resetPassword: RequestHandler = async (req, res): Promise<void> => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400).json({ msg: 'Vui lòng cung cấp mật khẩu mới.' });
    return;
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // Kiểm tra token còn hiệu lực
    });

    if (!user) {
      res.status(400).json({ msg: 'Token không hợp lệ hoặc đã hết hạn.' });
      return;
    }

    // Cập nhật mật khẩu
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = undefined; // Xóa token sau khi sử dụng
    user.passwordResetExpires = undefined; // Xóa thời gian hết hạn
    user.updatedAt = new Date();

    await user.save();
    res.status(200).json({ msg: 'Mật khẩu của bạn đã được đặt lại thành công.' });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};