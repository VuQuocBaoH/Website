// D:\code\DACNTT2\WEBSITEBUILDING\event-backend\src\controllers\userController.ts
import { Request, Response, RequestHandler } from 'express';
import User, { IUser } from '../models/User';
import SpeakerInvitation, { ISpeakerInvitation } from '../models/SpeakerInvitation'; 
import Event, { IEvent } from '../models/Event'; // 
import mongoose from 'mongoose';
import { sendEmail } from '../utils/emailService';


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

// @route   GET /api/users/:userId/profile
// @desc    Get public profile of a user (or full profile if admin)
// @access  Public (basic info), Private (full info for admin)
export const getUserPublicProfile: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.params.userId;
    let user: IUser | null;

    // If the request comes from an authenticated admin, they can see more details
    if (req.user?.role === 'admin') {
      user = await User.findById(userId).select('-passwordHash'); // Admin sees full details
    } else {
      user = await User.findById(userId).select('-passwordHash -email -role -passwordResetToken -passwordResetExpires'); // Public sees less sensitive info
    }

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

// @route   POST /api/users/request-speaker
// @desc    User requests to become a speaker
// @access  Private (User)
export const requestSpeaker: RequestHandler = async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ msg: 'User not authenticated' });
    return;
  }

  const { speakerBio, speakerTopics, speakerImage } = req.body;

  if (!speakerBio || !speakerTopics || !Array.isArray(speakerTopics) || speakerTopics.length === 0) {
    res.status(400).json({ msg: 'Please provide speaker bio and at least one topic.' });
    return;
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    if (user.speakerStatus === 'approved') {
      res.status(400).json({ msg: 'You are already an approved speaker.' });
      return;
    }
    if (user.speakerStatus === 'pending') {
      res.status(400).json({ msg: 'Your speaker request is already pending review.' });
      return;
    }

    user.speakerBio = speakerBio;
    user.speakerTopics = speakerTopics;
    user.speakerImage = speakerImage || undefined; 
    user.speakerStatus = 'pending';
    user.speakerRequestDate = new Date();
    user.updatedAt = new Date();

    await user.save();
    res.json({ msg: 'Speaker request submitted successfully. Awaiting admin approval.', user: user.toObject() });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/users/speaker-requests
// @desc    Admin gets all pending speaker requests
// @access  Private (Admin)
export const getPendingSpeakerRequests: RequestHandler = async (req, res): Promise<void> => {
  try {
    const pendingSpeakers = await User.find({ speakerStatus: 'pending' }).select('-passwordHash');
    res.json(pendingSpeakers);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/users/speaker-requests/:id/approve
// @desc    Admin approves a speaker request
// @access  Private (Admin)
export const approveSpeakerRequest: RequestHandler = async (req, res): Promise<void> => {
  const { id } = req.params; // User ID to approve

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ msg: 'Invalid user ID' });
    return;
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    if (user.speakerStatus === 'approved') {
      res.status(400).json({ msg: 'User is already an approved speaker.' });
      return;
    }

    user.speakerStatus = 'approved';
    user.speakerApprovalDate = new Date();
    user.updatedAt = new Date();
    await user.save();

    if (user.email) {
        const subject = 'Yêu cầu làm diễn giả của bạn đã được duyệt!';
        const text = `Chúc mừng bạn ${user.username}!\n\nYêu cầu làm diễn giả của bạn đã được quản trị viên duyệt thành công. Bạn hiện là một diễn giả chính thức và có thể được phân công vào các sự kiện.`;
        const html = `
            <p>Xin chào <strong>${user.username}</strong>,</p>
            <p>Chúc mừng! Yêu cầu làm diễn giả của bạn đã được quản trị viên của chúng tôi duyệt thành công.</p>
            <p>Bạn hiện là một diễn giả chính thức trên nền tảng của chúng tôi và có thể được phân công vào các sự kiện sắp tới.</p>
            <p>Chúng tôi rất mong được hợp tác với bạn.</p>
            <p>Trân trọng,</p>
            <p>Đội ngũ Tổ chức Sự kiện</p>
        `;
        await sendEmail({ to: user.email, subject, text, html });
    }

    res.json({ msg: 'Speaker request approved successfully.', user: user.toObject() });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/users/speaker-requests/:id/reject
// @desc    Admin rejects a speaker request
// @access  Private (Admin)
export const rejectSpeakerRequest: RequestHandler = async (req, res): Promise<void> => {
  const { id } = req.params; // User ID to reject

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ msg: 'Invalid user ID' });
    return;
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    if (user.speakerStatus === 'rejected') {
      res.status(400).json({ msg: 'User\'s speaker request is already rejected.' });
      return;
    }

    user.speakerStatus = 'rejected';
    user.speakerApprovalDate = undefined; // Clear approval date if it was set before
    user.updatedAt = new Date();
    await user.save();

    if (user.email) {
        const subject = 'Thông báo về yêu cầu làm diễn giả của bạn';
        const text = `Xin chào ${user.username},\n\nChúng tôi rất tiếc phải thông báo rằng yêu cầu làm diễn giả của bạn đã bị từ chối. Vui lòng xem xét lại thông tin đã gửi hoặc liên hệ với quản trị viên để biết thêm chi tiết.`;
        const html = `
            <p>Xin chào <strong>${user.username}</strong>,</p>
            <p>Chúng tôi rất tiếc phải thông báo rằng yêu cầu làm diễn giả của bạn đã bị từ chối.</p>
            <p>Bạn có thể xem xét lại thông tin đã gửi hoặc liên hệ với quản trị viên của chúng tôi để biết thêm chi tiết về lý do từ chối.</p>
            <p>Cảm ơn sự quan tâm của bạn.</p>
            <p>Trân trọng,</p>
            <p>Đội ngũ Tổ chức Sự kiện</p>
        `;
        await sendEmail({ to: user.email, subject, text, html });
    }

    res.json({ msg: 'Speaker request rejected successfully.', user: user.toObject() });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/users/me/speaker-invitations
// @desc    Get all speaker invitations for the logged-in user (speaker)
// @access  Private (Speaker)
export const getSpeakerInvitations: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
      return;
    }

    // Lấy các lời mời mà người dùng này là speakerId
    const invitations = await SpeakerInvitation.find({ speakerId: userId })
      .populate('eventId', 'title date time location address image') // Lấy thông tin sự kiện
      .populate('organizerId', 'username email'); // Lấy thông tin người tổ chức

    res.status(200).json(invitations);
  } catch (err: any) {
    console.error('Lỗi khi lấy lời mời diễn giả:', err.message);
    res.status(500).send('Lỗi máy chủ.');
  }
};

// @route   PUT /api/speaker-invitations/:invitationId/respond
// @desc    Speaker responds to an invitation (accept/decline)
// @access  Private (Speaker)
export const respondToSpeakerInvitation: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id; // ID của diễn giả đang đăng nhập
    const { invitationId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
      return;
    }
    if (!['accepted', 'declined'].includes(action)) {
      res.status(400).json({ msg: 'Hành động phản hồi không hợp lệ. Chỉ chấp nhận "accepted" hoặc "declined".' });
      return;
    }

    const invitation = await SpeakerInvitation.findById(invitationId)
        .populate('eventId', 'title date time location address schedule') // Populate schedule
        .populate('organizerId', 'username email'); // Populate organizer info

    if (!invitation) {
      res.status(404).json({ msg: 'Không tìm thấy lời mời.' });
      return;
    }

    // Kiểm tra xem lời mời có thuộc về diễn giả hiện tại không
    if (invitation.speakerId.toString() !== userId) {
      res.status(403).json({ msg: 'Bạn không có quyền phản hồi lời mời này.' });
      return;
    }

    if (invitation.status !== 'pending') {
      res.status(400).json({ msg: `Lời mời đã ở trạng thái "${invitation.status}". Không thể thay đổi.` });
      return;
    }

    invitation.status = action;
    invitation.responseDate = new Date();
    await invitation.save();

    // Gửi email cho diễn giả khi chấp nhận
    if (action === 'accept') {
        const event = invitation.eventId as unknown as IEvent;
        const organizer = invitation.organizerId as unknown as IUser;
        const speakerUser = await User.findById(userId); // Lấy thông tin người dùng diễn giả

        if (event && organizer && speakerUser) {
            const eventDate = new Date(event.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            let scheduleHtml = '';
            let scheduleText = ''; 
            if (event.schedule && event.schedule.length > 0) {
                scheduleHtml = `
                    <h4>Lịch trình sự kiện:</h4>
                    <ul>
                        ${event.schedule.map(item => `<li><strong>${item.time}</strong>: ${item.title} - ${item.description || ''}</li>`).join('')}
                    </ul>
                `;
                scheduleText = `\nLịch trình sự kiện:\n` + 
                               event.schedule.map(item => `${item.time}: ${item.title} - ${item.description || ''}`).join('\n');
            }

            const subject = `Chúc mừng! Bạn đã chấp nhận lời mời cho sự kiện ${event.title}`;
            const htmlContent = `
                <p>Xin chào <strong>${speakerUser.username}</strong>,</p>
                <p>Cảm ơn bạn đã chấp nhận lời mời tham gia sự kiện <strong>${event.title}</strong> của <strong>${organizer.username}</strong>.</p>
                <p>Chúng tôi rất mong được hợp tác với bạn!</p>
                <h3>Thông tin chi tiết sự kiện:</h3>
                <ul>
                    <li><strong>Tên sự kiện:</strong> ${event.title}</li>
                    <li><strong>Ngày:</strong> ${eventDate}</li>
                    <li><strong>Thời gian:</strong> ${event.time}</li>
                    <li><strong>Địa điểm:</strong> ${event.location}, ${event.address || ''}</li>
                    <li><strong>Người tổ chức:</strong> ${organizer.username} (${organizer.email})</li>
                </ul>
                ${scheduleHtml}
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với người tổ chức.</p>
                <p>Trân trọng,<br/>Đội ngũ của ${organizer.username}</p>
            `;

            const textContent = `Xin chào ${speakerUser.username},\n\n` +
                                `Cảm ơn bạn đã chấp nhận lời mời tham gia sự kiện "${event.title}" của ${organizer.username}.\n\n` +
                                `Chúng tôi rất mong được hợp tác với bạn!\n\n` +
                                `Thông tin chi tiết sự kiện:\n` +
                                `Tên sự kiện: ${event.title}\n` +
                                `Ngày: ${eventDate}\n` +
                                `Thời gian: ${event.time}\n` +
                                `Địa điểm: ${event.location}, ${event.address || ''}\n` +
                                `Người tổ chức: ${organizer.username} (${organizer.email})` +
                                `${scheduleText}\n\n` +
                                `Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với người tổ chức.\n\n` +
                                `Trân trọng,\nĐội ngũ của ${organizer.username}`;

            await sendEmail({
                to: speakerUser.email,
                subject: subject,
                text: textContent, 
                html: htmlContent
            });
        }
    }

    res.status(200).json({ msg: `Lời mời đã được ${action === 'accept' ? 'chấp nhận' : 'từ chối'} thành công.`, invitation });
  } catch (err: any) {
    console.error('Lỗi khi phản hồi lời mời diễn giả:', err.message);
    res.status(500).send('Lỗi máy chủ.');
  }
};