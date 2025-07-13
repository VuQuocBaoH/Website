// src/controllers/eventController.ts
import { Request, Response, RequestHandler } from 'express';
import Event, { IEvent } from '../models/Event';
import User, { IUser } from '../models/User'; // Import User model
import mongoose from 'mongoose';
import Ticket, { ITicket } from '../models/Ticket';
import SpeakerInvitation, { ISpeakerInvitation } from '../models/SpeakerInvitation'; // Import SpeakerInvitation model
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Cấu hình Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const addHour = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours + 1, minutes);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const subtractHour = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours - 1, minutes);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Hàm tạo QR code
const generateQRCodeDataURL = async (data: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, { width: 200, margin: 2 });
    return qrCodeDataUrl;
  } catch (err) {
    console.error('Lỗi khi tạo mã QR:', err);
    throw new Error('Không thể tạo mã QR');
  }
};

// @route   POST /api/events
// @desc    Create a new event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực' });
      return;
    }

    const {
      title, date, startTime, endTime, location, address, image, price, isFree, category,
      description, longDescription, organizerName, schedule,
      roomNumber 
    } = req.body;

    const eventDate = new Date(date);
    const startOfDay = new Date(new Date(eventDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(eventDate).setHours(23, 59, 59, 999));

    const bufferedStartTime = subtractHour(startTime);
    const bufferedEndTime = addHour(endTime);

    const conflictingEvent = await Event.findOne({
      roomNumber: roomNumber,
      date: { $gte: startOfDay, $lte: endOfDay },
      startTime: { $lt: bufferedEndTime },
      endTime: { $gt: bufferedStartTime }
    });

    if (conflictingEvent) {
      res.status(409).json({ 
        msg: `Phòng ${roomNumber} đã được đặt trong khoảng thời gian từ ${conflictingEvent.startTime} đến ${conflictingEvent.endTime} vào ngày này. Vui lòng chọn thời gian sau hơn 1 tiếng kể từ khi sự kiện trước kết thúc.`
      });
      return;
    }


    if (!roomNumber || typeof roomNumber !== 'number' || roomNumber < 1 || roomNumber > 10) {
        res.status(400).json({ msg: 'Số phòng không hợp lệ. Vui lòng chọn từ 1 đến 10.' });
        return;
    }
    const calculatedCapacity = roomNumber * 100;

    if (isFree) {
      req.body.isFree = true;
      req.body.price = undefined;
    } else {
      if (
        !price ||
        typeof price.amount !== 'number' ||
        typeof price.currency !== 'string' ||
        !['vnd', 'usd'].includes(price.currency.toLowerCase())
      ) {
        res.status(400).json({ msg: 'Giá vé không hợp lệ.' });
        return;
      }
      req.body.isFree = false;
      req.body.price = {
        amount: price.amount,
        currency: price.currency.toLowerCase(),
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ msg: 'Không tìm thấy người dùng' });
      return;
    }

    const newEvent = new Event({
      title,
      date: new Date(date),
      startTime, 
      endTime,
      location,
      address,
      image,
      isFree: req.body.isFree,
      price: req.body.price,
      category,
      organizer: { name: organizerName || user.username },
      organizerId: new mongoose.Types.ObjectId(userId),
      description,
      longDescription: longDescription || description,
      capacity: calculatedCapacity, 
      roomNumber: roomNumber,      
      status: 'active',
      schedule: schedule || [],
      tickets: [],
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   PUT /api/events/:id
// @desc    Update an event
export const updateEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let event: any = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện' });
      return;
    }

    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Không được phép cập nhật sự kiện này' });
      return;
    }

    const now = new Date();
    const [endHours, endMinutes] = event.endTime.split(':').map(Number);
    const eventEndDateTime = new Date(event.date);
    eventEndDateTime.setHours(endHours, endMinutes, 0, 0);

    if (eventEndDateTime < now) {
        res.status(403).json({ msg: 'Không thể chỉnh sửa sự kiện đã kết thúc.' });
        return;
    }

    const {
      title, date, startTime, endTime, location, address, image, price, isFree, category,
      description, longDescription, status, schedule,
      isFeatured,
      isUpcoming,
      roomNumber 
    } = req.body;

    if (date || startTime || endTime || roomNumber) {
        const checkDate = date ? new Date(date) : event.date;
        const checkStartTime = startTime !== undefined ? startTime : event.startTime;
        const checkEndTime = endTime !== undefined ? endTime : event.endTime;
        const checkRoomNumber = roomNumber !== undefined ? roomNumber : event.roomNumber;

        const startOfDay = new Date(new Date(checkDate).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(checkDate).setHours(23, 59, 59, 999));

        const bufferedStartTime = subtractHour(checkStartTime);
        const bufferedEndTime = addHour(checkEndTime);

        const conflictingEvent = await Event.findOne({
            _id: { $ne: req.params.id }, 
            roomNumber: checkRoomNumber,
            date: { $gte: startOfDay, $lte: endOfDay },
            startTime: { $lt: bufferedEndTime },
            endTime: { $gt: bufferedStartTime }
        });

        if (conflictingEvent) {
            res.status(409).json({ 
                msg: `Phòng ${checkRoomNumber} đã được đặt trong khoảng thời gian từ ${conflictingEvent.startTime} đến ${conflictingEvent.endTime} vào ngày này. Vui lòng chọn thời gian sau hơn 1 tiếng kể từ khi sự kiện trước kết thúc.`
            });
            return;
        }
    }

    if (title !== undefined) event.title = title;
    if (date !== undefined) event.date = new Date(date);
    if (startTime !== undefined) event.startTime = startTime; 
    if (endTime !== undefined) event.endTime = endTime;
    if (location !== undefined) event.location = location;
    if (address !== undefined) event.address = address;
    if (image !== undefined) event.image = image;
    if (category !== undefined) event.category = category;
    if (description !== undefined) event.description = description;
    if (longDescription !== undefined) event.longDescription = longDescription;
    if (roomNumber !== undefined) {
        const newRoomNumber = Number(roomNumber);
        if (newRoomNumber >= 1 && newRoomNumber <= 10) {
            event.roomNumber = newRoomNumber;
            event.capacity = newRoomNumber * 100; 
        }
    }
    if (status !== undefined) event.status = status;
    if (schedule !== undefined) event.schedule = schedule;
    
    if (typeof isFree === 'boolean') {
      event.isFree = isFree;
    }

    if (isFeatured !== undefined) {
      event.isFeatured = isFeatured;
    }
    if (isUpcoming !== undefined) {
      event.isUpcoming = isUpcoming;
    }

    if (event.isFree === false && price) {
      if (
        typeof price.amount !== 'number' ||
        typeof price.currency !== 'string' ||
        !['vnd', 'usd'].includes(price.currency.toLowerCase())
      ) {
        res.status(400).json({ msg: 'Định dạng giá không hợp lệ' });
        return;
      }
      event.price = {
        amount: Number(price.amount),
        currency: price.currency.toLowerCase(),
      };
    } else if (event.isFree === true) {
      event.price = undefined;
    }

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện (ID không hợp lệ)' });
      return;
    }
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   POST /api/events/:id/register
// @desc    Register for a FREE event and generate ticket
export const registerForEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực' });
      return;
    }

    const event = await Event.findById(req.params.id);
    const user = await User.findById(userId);

    if (!event || !user) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện hoặc người dùng' });
      return;
    }

    if (!event.isFree) {
      res.status(400).json({ msg: 'Đây là sự kiện có phí. Vui lòng sử dụng tùy chọn mua vé.' });
      return;
    }

    const existingTicket = await Ticket.findOne({ eventId: event._id, userId: userId });
    if (existingTicket) {
        res.status(400).json({ msg: 'Bạn đã đăng ký sự kiện này rồi.' });
        return;
    }

    const currentTicketsCount = await Ticket.countDocuments({ eventId: event._id });
    if (event.capacity && currentTicketsCount >= event.capacity) {
        res.status(400).json({ msg: 'Sự kiện đã đầy' });
        return;
    }

    const ticketCode = uuidv4();
    const qrCodeData = `Mã vé: ${ticketCode}\nID Sự kiện: ${event._id}\nID Người dùng: ${user.id}`;
    const qrCodeUrl = await generateQRCodeDataURL(qrCodeData);

    const newTicket = new Ticket({
      eventId: event._id,
      userId: userId,
      ticketCode: ticketCode,
      qrCodeUrl: qrCodeUrl,
      isPaid: false,
      isFreeTicket: true,
      checkInStatus: 'pending',
    });

    await newTicket.save();

    event.tickets.push(newTicket._id as mongoose.Types.ObjectId);
    await event.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Xác nhận đăng ký sự kiện: ${event.title}`,
      html: `
        <p>Xin chào ${user.username},</p>
        <p>Bạn đã đăng ký thành công sự kiện <strong>${event.title}</strong>.</p>
        <p><strong>Ngày:</strong> ${event.date.toLocaleDateString('vi-VN')}</p>
        <p><strong>Thời gian:</strong> từ ${event.startTime} đến ${event.endTime}</p>
        <p><strong>Địa điểm:</strong> ${event.location}, ${event.address || ''}</p>
        <p>Mã vé của bạn: <strong>${ticketCode}</strong></p>
        <p>Vui lòng mang theo QR code này khi đến sự kiện để check-in:</p>
        <img src="${qrCodeUrl}" alt="QR Code của bạn" style="width:300px; height:300px; display:block; margin: 10px 0;"/>
        <p><a href="${process.env.FRONTEND_BASE_URL}/my-tickets" style="display:inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Xem QR Code của tôi</a></p>
        <p>Bạn có thể xem vé của mình tại tài khoản của bạn trên website của chúng tôi.</p>
        <p>Cảm ơn bạn đã tham gia!</p>
        <p>Trân trọng,<br/>Đội ngũ ${event.organizer?.name || 'Tổ chức sự kiện'}</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Lỗi khi gửi email:', error);
      } else {
        console.log('Email đã gửi: ' + info.response);
      }
    });

    res.status(201).json({ msg: 'Đã đăng ký thành công sự kiện miễn phí và vé đã được gửi đến email!', ticket: newTicket });
  } catch (err: any) {
    console.error("Lỗi trong registerForEvent:", err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/events
// @desc    Get all events with filtering
export const getEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { search, category, dateFilter } = req.query;
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (dateFilter) {
      const today = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case 'Today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(new Date(startDate).setHours(23, 59, 59, 999));
          query.date = { $gte: startDate, $lte: endDate };
          break;
        case 'Tomorrow':
            startDate = new Date();
            startDate.setDate(today.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'This Weekend':
            // Lấy ngày hiện tại
            const currentDay = today.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
            let daysUntilSaturday;

            if (currentDay === 6) { // If today is Saturday
                daysUntilSaturday = 0;
            } else {
                daysUntilSaturday = 6 - currentDay;
            }

            startDate = new Date(today);
            startDate.setDate(today.getDate() + daysUntilSaturday); // Set to Saturday of this week
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 1); // Set to Sunday of this week
            endDate.setHours(23, 59, 59, 999);

            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'This Week':
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday (start of week)
            firstDayOfWeek.setHours(0, 0, 0, 0);

            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // Go to Saturday (end of week)
            lastDayOfWeek.setHours(23, 59, 59, 999);
            query.date = { $gte: firstDayOfWeek, $lte: lastDayOfWeek };
            break;
        case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'Next Month':
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            startDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
            endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'All Upcoming':
            query.date = { $gte: new Date() };
            break;
        default:
          break;
      }
    }

    const events = await Event.find(query)
      .populate('tickets')
      .sort({ date: 1 });

    res.json(events);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/events/featured
// @desc    Get featured events
export const getFeaturedEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    // Lấy ngày hôm nay
    const today = new Date();
    // Thiết lập thời gian về đầu ngày (00:00:00)
    today.setHours(0, 0, 0, 0);

    // Sử dụng biến 'today' trong câu truy vấn
    const featuredEvents = await Event.find({ isFeatured: true, date: { $gte: today } })
      .populate('tickets')
      .sort({ date: 1 });
      
    res.json(featuredEvents);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/events/upcoming
// @desc    Get upcoming events
export const getUpcomingEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const upcomingEvents = await Event.find({
      date: { $gte: today } 
    })
    .sort({ date: 1 }) 
    // Removed .limit(4)
    .populate('organizer', 'name'); 

    res.json(upcomingEvents);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/:id
// @desc    Get event by ID
export const getEventById: RequestHandler = async (req, res): Promise<void> => {
  console.log(`[getEventById] Yêu cầu nhận được cho ID Sự kiện: ${req.params.id}`);
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'tickets',
        populate: { path: 'userId', select: 'username email' }
      });

    console.log(`[getEventById] Kết quả tìm kiếm theo ID và populate: ${event ? event.title : 'Không tìm thấy Sự kiện trong DB'}`);

    if (!event) {
      console.warn(`[getEventById] Không tìm thấy sự kiện với ID ${req.params.id} trong cơ sở dữ liệu hoặc không thể populate.`);
      res.status(404).json({ msg: 'Không tìm thấy sự kiện' });
      return;
    }

    console.log(`[getEventById] Đã lấy thành công sự kiện: ${event._id} - ${event.title}`);
    res.json(event);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
      console.error(`[getEventById] Định dạng ID Sự kiện không hợp lệ: ${req.params.id}. Lỗi: ${err.message}`);
      res.status(404).json({ msg: 'Không tìm thấy sự kiện (Định dạng ID không hợp lệ)' });
      return;
    }
    console.error(`[getEventById] Lỗi máy chủ khi xử lý yêu cầu cho ID ${req.params.id}:`, err);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   DELETE /api/events/:id
// @desc    Delete an event
export const deleteEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện' });
      return;
    }
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Không được phép xóa sự kiện này' });
      return;
    }
    // Xóa tất cả các vé liên quan đến sự kiện này
    await Ticket.deleteMany({ eventId: event._id });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Sự kiện đã được xóa' });
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện (ID không hợp lệ)' });
      return;
    }
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   POST /api/events/:id/unregister
// @desc    Unregister from an event (by deleting their ticket)
export const unregisterFromEvent: RequestHandler = async (req, res): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
          res.status(401).json({ msg: 'Không được phép, không có ID người dùng' });
          return;
      }
      const event = await Event.findById(req.params.id);
      if (!event) {
        res.status(404).json({ msg: 'Không tìm thấy sự kiện' });
        return;
      }

      const deletedTicket = await Ticket.findOneAndDelete({ eventId: event._id, userId: userId });

      if (!deletedTicket) {
          res.status(400).json({ msg: 'Bạn chưa đăng ký sự kiện này hoặc vé của bạn không thể tìm thấy.' });
          return;
      }

      event.tickets = event.tickets.filter(
        (ticketId) => ticketId.toString() !== (deletedTicket._id as mongoose.Types.ObjectId).toString()
      );
      await event.save();

      res.json({ msg: 'Đã hủy đăng ký thành công khỏi sự kiện', event });
    } catch (err: any) {
      if (err.kind === 'ObjectId') {
          res.status(404).json({ msg: 'Không tìm thấy sự kiện hoặc người dùng (ID không hợp lệ)' });
          return;
      }
      res.status(500).send('Lỗi máy chủ');
    }
};

// @route   GET /api/events/my-events
// @desc    Get all events created by the logged-in user
export const getMyEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực' });
      return;
    }
    const myEvents = await Event.find({ organizerId: userId })
      .populate('tickets')
      .sort({ date: -1 });
    res.json(myEvents);
  } catch (err: any) {
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/events/organizer/:organizerId
// @desc    Get all events by organizer
export const getEventsByOrganizer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const organizerId = req.params.organizerId;
    const events = await Event.find({ organizerId: organizerId })
      .populate('tickets')
      .sort({ date: -1 });
    res.json(events);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'Không tìm thấy người tổ chức' });
        return;
    }
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   POST /api/events/:id/purchase-ticket
// @desc    Simulate ticket purchase for a PAID event and generate ticket
export const purchaseTicket: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực' });
      return;
    }

    const event = await Event.findById(req.params.id);
    const user = await User.findById(userId);

    if (!event || !user) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện hoặc người dùng' });
      return;
    }

    if (event.isFree) {
      res.status(400).json({ msg: 'Đây là sự kiện miễn phí. Vui lòng sử dụng luồng đăng ký.' });
      return;
    }

    if (!event.price || typeof event.price.amount !== 'number' || typeof event.price.currency !== 'string') {
        res.status(400).json({ msg: 'Thông tin giá sự kiện bị thiếu hoặc không hợp lệ trong cơ sở dữ liệu.' });
        return;
    }

    const existingTicket = await Ticket.findOne({ eventId: event._id, userId: userId });
    if (existingTicket) {
        res.status(400).json({ msg: 'Bạn đã mua vé cho sự kiện này rồi.' });
        return;
    }

    const currentTicketsCount = await Ticket.countDocuments({ eventId: event._id });
    if (event.capacity && currentTicketsCount >= event.capacity) {
        res.status(400).json({ msg: 'Sự kiện đã đầy.' });
        return;
    }

    const ticketCode = uuidv4();
    const qrCodeData = `Mã vé: ${ticketCode}\nID Sự kiện: ${event._id}\nID Người dùng: ${user.id}\nĐã thanh toán: Có`;
    const qrCodeUrl = await generateQRCodeDataURL(qrCodeData);

    const newTicket = new Ticket({
      eventId: event._id,
      userId: userId,
      ticketCode: ticketCode,
      qrCodeUrl: qrCodeUrl,
      isPaid: true,
      isFreeTicket: false,
      checkInStatus: 'pending',
    });

    await newTicket.save();

    event.tickets.push(newTicket._id as mongoose.Types.ObjectId);
    await event.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Xác nhận mua vé sự kiện: ${event.title}`,
      html: `
        <p>Xin chào ${user.username},</p>
        <p>Cảm ơn bạn đã mua vé cho sự kiện <strong>${event.title}</strong>.</p>
        <p><strong>Ngày:</strong> ${event.date.toLocaleDateString('vi-VN')}</p>
        <p><strong>Thời gian:</strong> từ ${event.startTime} đến ${event.endTime}</p>
        <p><strong>Địa điểm:</strong> ${event.location}, ${event.address || ''}</p>
        <p><strong>Giá vé:</strong> ${event.price.amount.toLocaleString('vi-VN')} ${event.price.currency.toUpperCase()}</p>
        <p>Mã vé của bạn: <strong>${ticketCode}</strong></p>
        <p>Vui lòng mang theo QR code này khi đến sự kiện để check-in:</p>
        <img src="${qrCodeUrl}" alt="QR Code của bạn" style="width:200px; height:200px; display:block; margin: 10px 0;"/>
        <p><a href="${process.env.FRONTEND_BASE_URL}/my-tickets" style="display:inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Xem QR Code của tôi</a></p>
        <p>Bạn có thể xem vé của mình tại tài khoản của bạn trên website của chúng tôi.</p>
        <p>Chúng tôi mong chờ được gặp bạn!</p>
        <p>Trân trọng,<br/>${event.organizer?.name || 'Tổ chức sự kiện'}</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Lỗi khi gửi email:', error);
      } else {
        console.log('Email đã gửi: ' + info.response);
      }
    });

    res.status(201).json({ msg: 'Đã mua vé thành công và gửi đến email!', ticket: newTicket });
  } catch (err: any) {
    console.error("Lỗi trong purchaseTicket (demo):", err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/events/my-tickets
// @desc    Get all tickets for the logged-in user
export const getMyTickets: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực' });
      return;
    }

    const tickets = await Ticket.find({ userId: userId })
      .populate('eventId')
      .sort({ purchaseDate: -1 });

    const formattedTickets = tickets.map(ticket => {
      const event = ticket.eventId as unknown as IEvent;
      if (!event) {
        console.warn(`Không tìm thấy sự kiện cho vé ${ticket._id}. Có thể đã bị xóa.`);
        return null;
      }
      return {
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        qrCodeUrl: ticket.qrCodeUrl,
        purchaseDate: ticket.purchaseDate.toISOString(),
        isPaid: ticket.isPaid,
        isFreeTicket: ticket.isFreeTicket,
        checkInStatus: ticket.checkInStatus,
        checkInTime: ticket.checkInTime ? ticket.checkInTime.toISOString() : undefined,
        event: {
          id: event._id,
          title: event.title,
          date: event.date.toISOString(),
          // time: event.time,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          address: event.address,
          image: event.image,
          isFree: event.isFree,
          price: event.isFree ? 'Miễn phí' : `${event.price?.amount?.toLocaleString('vi-VN')} ${event.price?.currency?.toUpperCase()}`,
          category: event.category,
          organizerName: event.organizer?.name || 'Người tổ chức không xác định',
        },
      };
    }).filter(ticket => ticket !== null);

    res.json(formattedTickets);
  } catch (err: any) {
    console.error("Lỗi trong getMyTickets:", err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

export const getEventTickets: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện' });
      return;
    }

    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Không được phép xem vé cho sự kiện này.' });
      return;
    }

    const tickets = await Ticket.find({ eventId: eventId })
      .populate('userId', 'username email')
      .sort({ purchaseDate: 1 });

    const formattedTickets = tickets.map(ticket => {
      const user = ticket.userId as any;
      return {
        id: ticket._id,
        ticketCode: ticket.ticketCode,
        qrCodeUrl: ticket.qrCodeUrl,
        purchaseDate: ticket.purchaseDate.toISOString(),
        isPaid: ticket.isPaid,
        isFreeTicket: ticket.isFreeTicket,
        checkInStatus: ticket.checkInStatus,
        checkInTime: ticket.checkInTime ? ticket.checkInTime.toISOString() : undefined,
        user: user ? { id: user.id, username: user.username, email: user.email } : null,
      };
    });

    res.json(formattedTickets);
  } catch (err: any) {
    console.error('Lỗi khi lấy vé sự kiện:', err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   POST /api/events/tickets/check-in
// @desc    Check-in a ticket by its code for a specific event
// @access  Private (Organizer/Admin)
export const checkInTicket: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { ticketCode, eventId } = req.body;

    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
      return;
    }

    if (!ticketCode || !eventId) {
      res.status(400).json({ msg: 'Mã vé và ID sự kiện là bắt buộc.' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện.' });
      return;
    }

    // Kiểm tra quyền: Chỉ người tổ chức sự kiện hoặc admin mới có thể check-in
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Bạn không có quyền check-in cho sự kiện này.' });
      return;
    }

    const ticket = await Ticket.findOne({ ticketCode: ticketCode, eventId: eventId });

    if (!ticket) {
      res.status(404).json({ msg: 'Không tìm thấy vé với mã này cho sự kiện đã chọn.' });
      return;
    }

    if (ticket.checkInStatus === 'checkedIn') {
      res.status(400).json({ msg: 'Vé này đã được check-in rồi.' });
      return;
    }

    // Cập nhật trạng thái check-in
    ticket.checkInStatus = 'checkedIn';
    ticket.checkInTime = new Date();
    await ticket.save();

    res.json({ msg: `Check-in thành công cho vé ${ticketCode}!`, ticket });
  } catch (err: any) {
    console.error('Lỗi khi check-in vé:', err.message);
    res.status(500).send('Lỗi máy chủ khi check-in.');
  }
};

// @route   POST /api/events/tickets/check-out
// @desc    Check-out a ticket by its code for a specific event (revert check-in)
// @access  Private (Organizer/Admin)
export const checkOutTicket: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { ticketCode, eventId } = req.body;

    if (!userId) {
      res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
      return;
    }

    if (!ticketCode || !eventId) {
      res.status(400).json({ msg: 'Mã vé và ID sự kiện là bắt buộc.' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện.' });
      return;
    }

    // Kiểm tra quyền: Chỉ người tổ chức sự kiện hoặc admin mới có thể check-out
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Bạn không có quyền check-out cho sự kiện này.' });
      return;
    }

    const ticket = await Ticket.findOne({ ticketCode: ticketCode, eventId: eventId });

    if (!ticket) {
      res.status(404).json({ msg: 'Không tìm thấy vé với mã này cho sự kiện đã chọn.' });
      return;
    }

    if (ticket.checkInStatus === 'pending') {
      res.status(400).json({ msg: 'Vé này chưa được check-in.' });
      return;
    }

    // Cập nhật trạng thái check-out
    ticket.checkInStatus = 'pending';
    ticket.checkInTime = undefined;
    await ticket.save();

    res.json({ msg: `Check-out thành công cho vé ${ticketCode}!`, ticket });
  } catch (err: any) {
    console.error('Lỗi khi check-out vé:', err.message);
    res.status(500).send('Lỗi máy chủ khi check-out.');
  }
};

// @route   GET /api/events/:eventId/statistics
// @desc    Get event attendance statistics
// @access  Private (Organizer/Admin)
export const getEventStatistics: RequestHandler = async (req, res): Promise<void> => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const eventId = req.params.eventId;

        if (!userId) {
            res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
            return;
        }

        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ msg: 'Không tìm thấy sự kiện.' });
            return;
        }

        // Kiểm tra quyền: Chỉ người tổ chức sự kiện hoặc admin mới có thể xem thống kê
        if (event.organizerId.toString() !== userId && userRole !== 'admin') {
            res.status(403).json({ msg: 'Bạn không có quyền xem thống kê cho sự kiện này.' });
            return;
        }

        // Lấy tất cả vé liên quan đến sự kiện này
        const tickets = await Ticket.find({ eventId: event._id });

        const totalSoldTickets = tickets.length;
        const checkedInTickets = tickets.filter(ticket => ticket.checkInStatus === 'checkedIn').length;
        
        const now = new Date();
        const isEventCompleted = event.date < now && event.status === 'active'; 

        let noShowTickets = 0;
        if (isEventCompleted) {
            noShowTickets = tickets.filter(ticket => ticket.checkInStatus === 'pending' || ticket.checkInStatus === 'noShow' || ticket.checkInStatus === 'expired').length;
        } else {
            noShowTickets = tickets.filter(ticket => ticket.checkInStatus === 'pending').length;
        }
        
        const pendingTickets = tickets.filter(ticket => ticket.checkInStatus === 'pending').length;
        
        res.status(200).json({
            eventId: event._id,
            eventName: event.title,
            totalSoldTickets: totalSoldTickets,
            checkedInTickets: checkedInTickets,
            noShowTickets: noShowTickets, 
            pendingTickets: pendingTickets 
        });

    } catch (err: any) {
        console.error('Lỗi khi lấy thống kê sự kiện:', err.message);
        if (err.kind === 'ObjectId') {
            res.status(400).json({ msg: 'ID sự kiện không hợp lệ.' });
        } else {
            res.status(500).send('Lỗi máy chủ khi lấy thống kê sự kiện.');
        }
    }
};

export const getAllEventStatistics: RequestHandler = async (req, res): Promise<void> => {
  try {
    const events = await Event.find().select('_id');

    if (!events) {
      res.status(404).json({ msg: 'Không tìm thấy sự kiện nào.' });
      return;
    }

    const allStats = await Promise.all(
      events.map(async (event) => {
        const eventId = event._id as mongoose.Types.ObjectId;

        const totalTickets = await Ticket.countDocuments({ eventId: eventId });
        const checkedInCount = await Ticket.countDocuments({
          eventId: eventId,
          status: 'checked-in',
        });

        return {
          eventId: eventId.toString(), 
          totalTickets,
          checkedInCount,
        };
      })
    );

    res.json(allStats);

  } catch (err: any) {
    console.error('Lỗi khi lấy tất cả thống kê sự kiện:', err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   GET /api/speakers/approved
// @desc    Get list of all approved speakers
// @access  Private (Any authenticated user can see approved speakers to invite)
export const getApprovedSpeakers: RequestHandler = async (req, res): Promise<void> => {
  try {
    // Chỉ lấy những user có speakerStatus là 'approved'
    const approvedSpeakers = await User.find(
      { speakerStatus: 'approved' },
      'username email speakerBio speakerTopics speakerImage' // Chỉ lấy các trường cần thiết
    );
    res.json(approvedSpeakers);
  } catch (err: any) {
    console.error('Lỗi khi lấy danh sách diễn giả đã duyệt:', err.message);
    res.status(500).send('Lỗi máy chủ');
  }
};

// @route   POST /api/events/:eventId/invite-speaker
// @desc    Invite a speaker to an event
// @access  Private (Event Organizer)
export const inviteSpeaker: RequestHandler = async (req, res): Promise<void> => {
    try {
        const userId = req.user?.id; // ID của người tổ chức đang đăng nhập
        const { eventId } = req.params;
        const { speakerId, message } = req.body;

        if (!userId) {
            res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
            return;
        }
        if (!speakerId) {
            res.status(400).json({ msg: 'ID diễn giả là bắt buộc.' });
            return;
        }

        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ msg: 'Không tìm thấy sự kiện.' });
            return;
        }

        // Kiểm tra xem người gọi API có phải là người tổ chức của sự kiện không
        if (event.organizerId.toString() !== userId) {
            res.status(403).json({ msg: 'Bạn không có quyền mời diễn giả cho sự kiện này.' });
            return;
        }

        const speaker = await User.findById(speakerId);
        if (!speaker || speaker.speakerStatus !== 'approved') {
            res.status(400).json({ msg: 'Diễn giả không hợp lệ hoặc chưa được phê duyệt.' });
            return;
        }

        // Kiểm tra xem lời mời đã tồn tại chưa
        const existingInvitation = await SpeakerInvitation.findOne({
            eventId: event._id,
            speakerId: speaker._id,
            organizerId: new mongoose.Types.ObjectId(userId)
        });

        if (existingInvitation && existingInvitation.status !== 'declined') { 
            res.status(400).json({ msg: 'Lời mời đến diễn giả này đã tồn tại hoặc đang chờ phản hồi.' });
            return; 
        }
        if (existingInvitation && existingInvitation.status === 'declined') {
            existingInvitation.status = 'pending';
            existingInvitation.invitationDate = new Date();
            existingInvitation.responseDate = undefined;
            existingInvitation.message = message;
            await existingInvitation.save();
            res.status(200).json({ msg: 'Đã gửi lại lời mời diễn giả thành công.', invitation: existingInvitation });
            return; 
        }

        const newInvitation = new SpeakerInvitation({
            eventId: event._id,
            speakerId: speaker._id,
            organizerId: new mongoose.Types.ObjectId(userId),
            message: message,
            status: 'pending'
        });

        await newInvitation.save();

        // Tùy chọn: Gửi email thông báo cho diễn giả về lời mời mới
        // (Sẽ triển khai chi tiết hơn ở các bước sau khi có email service setup)

        res.status(201).json({ msg: 'Lời mời diễn giả đã được gửi thành công.', invitation: newInvitation });

    } catch (err: any) {
        console.error('Lỗi khi mời diễn giả:', err.message);
        res.status(500).send('Lỗi máy chủ');
    }
};

// @route   GET /api/events/:eventId/invitations
// @desc    Get all speaker invitations for a specific event (for organizer)
// @access  Private (Event Organizer)
export const getEventInvitations: RequestHandler = async (req, res): Promise<void> => {
    try {
        const userId = req.user?.id; // ID của người tổ chức đang đăng nhập
        const userRole = req.user?.role;
        const { eventId } = req.params;

        if (!userId) {
            res.status(401).json({ msg: 'Người dùng chưa được xác thực.' });
            return;
        }

        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ msg: 'Không tìm thấy sự kiện.' });
            return;
        }

        // Kiểm tra xem người gọi API có phải là người tổ chức của sự kiện không
        if (event.organizerId.toString() !== userId && userRole !== 'admin') {
            res.status(403).json({ msg: 'Bạn không có quyền xem lời mời cho sự kiện này.' });
            return;
        }

        // Lấy tất cả lời mời liên quan đến sự kiện này và populate thông tin diễn giả
        const invitations = await SpeakerInvitation.find({ eventId: event._id })
            .populate('speakerId', 'username email speakerBio speakerTopics speakerImage') // Lấy thông tin diễn giả
            .populate('organizerId', 'username email'); // Có thể bỏ qua nếu người tổ chức không cần thông tin của chính họ

        res.status(200).json(invitations);
    } catch (err: any) {
        console.error('Lỗi khi lấy lời mời sự kiện:', err.message);
        res.status(500).send('Lỗi máy chủ.');
    }
};