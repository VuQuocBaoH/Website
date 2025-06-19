import { Request, Response, RequestHandler } from 'express';
import Event, { IEvent } from '../models/Event';
import User from '../models/User';
import mongoose from 'mongoose';
import Ticket, { ITicket } from '../models/Ticket';
// import DiscountCode from '../models/DiscountCode';
import { v4 as uuidv4 } from 'uuid'; // Để tạo mã vé duy nhất
import QRCode from 'qrcode'; // Để tạo QR code
import nodemailer from 'nodemailer'; // Để gửi email
import dotenv from 'dotenv'; // Đảm bảo đã import và gọi dotenv.config()
dotenv.config();

// @route   POST /api/events
// @desc    Create a new event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const {
      title, date, time, location, address, image, price, isFree, category,
      description, longDescription, capacity, organizerName, schedule
    } = req.body;

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
      res.status(404).json({ msg: 'User not found' });
      return;
    }

    const newEvent = new Event({
      title,
      date: new Date(date),
      time,
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
      capacity: capacity ? parseInt(capacity) : undefined,
      status: 'active',
      schedule: schedule || [],
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
// export const createEvent = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       res.status(401).json({ msg: 'User not authenticated' });
//       return;
//     }

//     const {
//       title, date, time, location, address, image, price, isFree, category,
//       description, longDescription, capacity, organizerName,
//       schedule
//     } = req.body;

//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404).json({ msg: 'User not found' });
//       return;
//     }

//     const newEventData: Partial<IEvent> = {
//       title,
//       date: new Date(date),
//       time,
//       location,
//       address,
//       image,
//       isFree,
//       category,
//       organizer: { name: organizerName || user.username },
//       organizerId: new mongoose.Types.ObjectId(userId),
//       description,
//       longDescription: longDescription || description,
//       capacity: capacity ? parseInt(capacity) : undefined,
//       status: 'active',
//       schedule: schedule || []
//     };

//     if (isFree === false && price) {
//       const amount = Number(price.amount);
//       const currency = price.currency;

//       if (
//         isNaN(amount) ||
//         typeof amount !== 'number' ||
//         !currency ||
//         typeof currency !== 'string' ||
//         !['vnd', 'usd'].includes(currency)
//       ) {
//         res.status(400).json({ msg: 'Giá vé không hợp lệ.' });
//         return;
//       }

//       newEventData.price = {
//         amount,
//         currency: price.currency as 'vnd' | 'usd'
//       };
//     } else {
//       newEventData.isFree = true;
//       newEventData.price = undefined;
//     }

//     console.log("newEventData gửi vào:", newEventData);

//     const newEvent = new Event(newEventData);
//     await newEvent.save();
//     res.status(201).json(newEvent);
//   } catch (err: any) {
//     console.error("Lỗi khi tạo sự kiện:", err);
//     res.status(500).send('Server Error');
//   }
// };

// @route   PUT /api/events/:id
// @desc    Update an event
// export const updateEvent: RequestHandler = async (req, res): Promise<void> => {
//   try {
//     const userId = req.user?.id;
//     const userRole = req.user?.role;
//     const event = await Event.findById(req.params.id);

//     if (!event) {
//       res.status(404).json({ msg: 'Event not found' });
//       return;
//     }

//     if (event.organizerId.toString() !== userId && userRole !== 'admin') {
//       res.status(403).json({ msg: 'Not authorized to update this event' });
//       return;
//     }

//     const {
//         title, date, time, location, address, image, price, isFree, category,
//         description, longDescription, capacity, status, schedule
//     } = req.body;
    
//     event.title = title || event.title;
//     event.date = date ? new Date(date) : event.date;
//     event.time = time || event.time;
//     event.location = location || event.location;
//     event.address = address || event.address;
//     event.image = image || event.image;
//     event.category = category || event.category;
//     event.description = description || event.description;
//     event.longDescription = longDescription || description || event.longDescription;
//     event.capacity = capacity ? parseInt(capacity, 10) : event.capacity;
//     event.status = status || event.status;
//     event.schedule = schedule || event.schedule;
//     event.isFree = isFree;

//     if (isFree === false && price) {
//         event.price = {
//             amount: Number(price.amount),
//             currency: price.currency,
//         };
//     } else {
//         event.isFree = true;
//         event.price = undefined;
//     }

//     const updatedEvent = await event.save();
//     res.json(updatedEvent);

//   } catch (err: any) {
//     console.error(err.message);
//     if (err.kind === 'ObjectId') {
//       res.status(404).json({ msg: 'Event not found (Invalid ID)' });
//       return;
//     }
//     res.status(500).send('Server Error');
//   }
// };

export const updateEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Tìm sự kiện. Sử dụng any tạm thời cho đến khi chúng ta chắc chắn về kiểu Document Mongoose
    // Đây là cách giải quyết nhanh nhất cho lỗi TypeScript hiện tại của bạn.
    // Cách lý tưởng hơn là định nghĩa đúng kiểu Mongoose Document cho IEvent.
    let event: any = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    // Kiểm tra quyền (đã có sẵn)
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to update this event' });
      return;
    }

    const {
      title, date, time, location, address, image, price, isFree, category,
      description, longDescription, capacity, status, schedule,
      isFeatured, // Đảm bảo các trường này được destructure
      isUpcoming  // Đảm bảo các trường này được destructure
    } = req.body;

    // Cập nhật các trường thông thường
    // Sử dụng Object.assign an toàn hơn hoặc cập nhật từng trường nếu bạn muốn kiểm soát chặt chẽ
    if (title !== undefined) event.title = title;
    if (date !== undefined) event.date = new Date(date);
    if (time !== undefined) event.time = time;
    if (location !== undefined) event.location = location;
    if (address !== undefined) event.address = address;
    if (image !== undefined) event.image = image;
    if (category !== undefined) event.category = category;
    if (description !== undefined) event.description = description;
    if (longDescription !== undefined) event.longDescription = longDescription;
    if (capacity !== undefined) event.capacity = parseInt(capacity, 10);
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

    // Logic xử lý giá
    if (event.isFree === false && price) { 
      if (
        typeof price.amount !== 'number' ||
        typeof price.currency !== 'string' ||
        !['vnd', 'usd'].includes(price.currency.toLowerCase())
      ) {
        res.status(400).json({ msg: 'Invalid price format' });
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
      res.status(404).json({ msg: 'Event not found (Invalid ID)' });
      return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/events/:id/register
// @desc    Register for a FREE event
// export const registerForEvent: RequestHandler = async (req, res): Promise<void> => {
//     try {
//         const userId = req.user?.id;
//         if (!userId) {
//             res.status(401).json({ msg: 'User not authenticated' });
//             return;
//         }
        
//         const event = await Event.findById(req.params.id);
        
//         if (!event) {
//             res.status(404).json({ msg: 'Event not found' });
//             return;
//         }

//         if (!event.isFree) {
//             res.status(400).json({ msg: 'This is a paid event. Please use the payment flow.' });
//             return;
//         }

//         if (event.registeredAttendees.includes(new mongoose.Types.ObjectId(userId))) {
//             res.status(400).json({ msg: 'You are already registered for this event' });
//             return;
//         }

//         if (event.capacity && event.registeredAttendees.length >= event.capacity) {
//             res.status(400).json({ msg: 'Event is full' });
//             return;
//         }

//         event.registeredAttendees.push(new mongoose.Types.ObjectId(userId));
//         await event.save();
//         res.json({ msg: 'Successfully registered for the free event', event });
//     } catch (err: any) {
//         console.error(err.message);
//         res.status(500).send('Server Error');
//     }
// };
export const registerForEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    if (!event.isFree) {
      res.status(400).json({ msg: 'This is a paid event. Please use the payment flow.' });
      return;
    }

    if (event.registeredAttendees.includes(new mongoose.Types.ObjectId(userId))) {
      res.status(400).json({ msg: 'You are already registered for this event' });
      return;
    }

    if (event.capacity && event.registeredAttendees.length >= event.capacity) {
      res.status(400).json({ msg: 'Event is full' });
      return;
    }
    // if (typeof req.body.price === 'string' && req.body.price.toLowerCase() === 'free') {
    //   req.body.price = undefined;
    // }

    event.registeredAttendees.push(new mongoose.Types.ObjectId(userId));
    await event.save();
    res.json({ msg: 'Successfully registered for the free event', event });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
        case 'This Week':
            const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            firstDayOfWeek.setHours(0, 0, 0, 0);
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);
            query.date = { $gte: firstDayOfWeek, $lte: lastDayOfWeek };
            break;
        case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'All Upcoming':
            query.date = { $gte: new Date() };
            break;
        default:
          break;
      }
    }
    const events = await Event.find(query).sort({ date: 1 });
    res.json(events);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/featured
// @desc    Get featured events
export const getFeaturedEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const featuredEvents = await Event.find({ isFeatured: true, date: { $gte: new Date() } }).sort({ date: 1 }).limit(4);
    res.json(featuredEvents);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/upcoming
// @desc    Get upcoming events
export const getUpcomingEvents: RequestHandler = async (req, res): Promise<void> => {
    try {
      const upcomingEvents = await Event.find({ date: { $gte: new Date() }, isUpcoming: true }).sort({ date: 1 }).limit(8);
      res.json(upcomingEvents);
    } catch (err: any) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };

// @route   GET /api/events/:id
// @desc    Get event by ID
export const getEventById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }
    res.json(event);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
      res.status(404).json({ msg: 'Event not found (Invalid ID)' });
      return;
    }
    res.status(500).send('Server Error');
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
      res.status(404).json({ msg: 'Event not found' });
      return;
    }
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to delete this event' });
      return;
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Event removed' });
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
      res.status(404).json({ msg: 'Event not found (Invalid ID)' });
      return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/events/:id/unregister
// @desc    Unregister from an event
export const unregisterFromEvent: RequestHandler = async (req, res): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
          res.status(401).json({ msg: 'Not authorized, no user ID' });
          return;
      }
      const event = await Event.findById(req.params.id);
      if (!event) {
        res.status(404).json({ msg: 'Event not found' });
        return;
      }
      const initialLength = event.registeredAttendees.length;
      event.registeredAttendees = event.registeredAttendees.filter(
        (attendeeId) => attendeeId.toString() !== userId
      );
      if (event.registeredAttendees.length === initialLength) {
          res.status(400).json({ msg: 'You are not registered for this event' });
          return;
      }
      await event.save();
      res.json({ msg: 'Successfully unregistered from the event', event });
    } catch (err: any) {
      if (err.kind === 'ObjectId') {
          res.status(404).json({ msg: 'Event or User not found (Invalid ID)' });
          return;
      }
      res.status(500).send('Server Error');
    }
};

// @route   GET /api/events/my-events
// @desc    Get all events created by the logged-in user
export const getMyEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    const myEvents = await Event.find({ organizerId: userId }).sort({ date: -1 });
    res.json(myEvents);
  } catch (err: any) {
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/organizer/:organizerId
// @desc    Get all events by organizer
export const getEventsByOrganizer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const organizerId = req.params.organizerId;
    const events = await Event.find({ organizerId: organizerId }).sort({ date: -1 });
    res.json(events);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'Organizer not found' });
        return;
    }
    res.status(500).send('Server Error');
  }
};

export const purchaseTicket: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    // ĐẢM BẢO CHỈ XỬ LÝ SỰ KIỆN CÓ PHÍ
    if (event.isFree) {
      res.status(400).json({ msg: 'This is a free event. Please use the registration flow.' });
      return;
    }

    // Kiểm tra xem thông tin giá có hợp lệ không (từ DB)
    if (!event.price || typeof event.price.amount !== 'number' || typeof event.price.currency !== 'string') {
        res.status(400).json({ msg: 'Event price information is missing or invalid in database.' });
        return;
    }

    if (event.registeredAttendees.includes(new mongoose.Types.ObjectId(userId))) {
      res.status(400).json({ msg: 'You have already purchased a ticket for this event.' });
      return;
    }

    if (event.capacity && event.registeredAttendees.length >= event.capacity) {
      res.status(400).json({ msg: 'Event is full.' });
      return;
    }

    // *************** DEMO/MOCK PAYMENT LOGIC START ***************
    // Đây là nơi trong ứng dụng thật bạn sẽ tích hợp cổng thanh toán.
    // Hiện tại, chúng ta giả định thanh toán luôn thành công và ghi nhận đăng ký.

    event.registeredAttendees.push(new mongoose.Types.ObjectId(userId));
    await event.save();

    res.json({
      msg: `Successfully purchased ticket for ${event.title} (Amount: ${event.price.amount} ${event.price.currency.toUpperCase()}).`,
      event,
      // Trong tương lai, bạn có thể trả về một paymentId, transactionId, etc.
    });
    // *************** DEMO/MOCK PAYMENT LOGIC END ***************

  } catch (err: any) {
    console.error("Error in purchaseTicket:", err.message);
    res.status(500).send('Server Error');
  }
};

// Hàm tạo QR code (trả về Data URL)
const generateQRCodeDataURL = async (data: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data);
    return qrCodeDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Ví dụ: smtp.gmail.com
  port: parseInt(process.env.EMAIL_PORT || '587'), // Ví dụ: 587
  secure: process.env.EMAIL_SECURE === 'true', // true cho 465, false cho các cổng khác (587, 25)
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn
    pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng hoặc mật khẩu email của bạn
  },
});