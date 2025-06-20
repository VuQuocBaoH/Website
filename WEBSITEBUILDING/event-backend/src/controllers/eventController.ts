// src/controllers/eventController.ts
import { Request, Response, RequestHandler } from 'express';
import Event, { IEvent } from '../models/Event';
import User from '../models/User';
import mongoose from 'mongoose';
import Ticket, { ITicket } from '../models/Ticket'; // Import Ticket model
import { v4 as uuidv4 } from 'uuid'; // Để tạo mã vé duy nhất
import QRCode from 'qrcode'; // Để tạo QR code
import nodemailer from 'nodemailer'; // Để gửi email
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

// Hàm tạo QR code
const generateQRCodeDataURL = async (data: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, { width: 200, margin: 2 });
    return qrCodeDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
};

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
      tickets: [], // Khởi tạo mảng tickets rỗng khi tạo sự kiện mới
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to update this event' });
      return;
    }

    const {
      title, date, time, location, address, image, price, isFree, category,
      description, longDescription, capacity, status, schedule,
      isFeatured,
      isUpcoming
    } = req.body;

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
// @desc    Register for a FREE event and generate ticket
export const registerForEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);
    const user = await User.findById(userId);

    if (!event || !user) {
      res.status(404).json({ msg: 'Event or User not found' });
      return;
    }

    if (!event.isFree) {
      res.status(400).json({ msg: 'This is a paid event. Please use the ticket purchase option.' });
      return;
    }

    const existingTicket = await Ticket.findOne({ eventId: event._id, userId: userId });
    if (existingTicket) {
        res.status(400).json({ msg: 'You are already registered for this event.' });
        return;
    }
    
    const currentTicketsCount = await Ticket.countDocuments({ eventId: event._id });
    if (event.capacity && currentTicketsCount >= event.capacity) {
        res.status(400).json({ msg: 'Event is full' });
        return;
    }

    const ticketCode = uuidv4();
    const qrCodeData = `Ticket Code: ${ticketCode}\nEvent ID: ${event._id}\nUser ID: ${user._id}`;
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

    event.tickets.push(newTicket._id as mongoose.Types.ObjectId); //
    await event.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Xác nhận đăng ký sự kiện: ${event.title}`,
      html: `
        <p>Xin chào ${user.username},</p>
        <p>Bạn đã đăng ký thành công sự kiện <strong>${event.title}</strong>.</p>
        <p><strong>Ngày:</strong> ${event.date.toLocaleDateString('vi-VN')}</p>
        <p><strong>Thời gian:</strong> ${event.time}</p>
        <p><strong>Địa điểm:</strong> ${event.location}, ${event.address || ''}</p>
        <p>Mã vé của bạn: <strong>${ticketCode}</strong></p>
        <p>Vui lòng mang theo QR code này khi đến sự kiện để check-in:</p>
        <img src="${qrCodeUrl}" alt="QR Code của bạn" style="width:200px; height:200px; display:block; margin: 10px 0;"/>
        <p>Bạn có thể xem vé của mình tại tài khoản của bạn trên website của chúng tôi.</p>
        <p>Cảm ơn bạn đã tham gia!</p>
        <p>Trân trọng,<br/>Đội ngũ ${event.organizer?.name || 'Tổ chức sự kiện'}</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(201).json({ msg: 'Successfully registered for the free event and ticket sent to email!', ticket: newTicket });
  } catch (err: any) {
    console.error("Error in registerForEvent:", err.message);
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
    // event.registeredAttendees.length is no longer relevant for total attendees.
    // We should use event.tickets.length (which is populated) or count tickets collection.
    // For simplicity, we'll assume the current event.registeredAttendees is still used in frontend,
    // but the backend will populate tickets.
    const events = await Event.find(query)
      .populate('tickets') // Populate tickets to count them if needed
      .sort({ date: 1 });

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
    const featuredEvents = await Event.find({ isFeatured: true, date: { $gte: new Date() } })
      .populate('tickets') // Populate tickets
      .sort({ date: 1 })
      .limit(4);
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
      const upcomingEvents = await Event.find({ date: { $gte: new Date() }, isUpcoming: true })
        .populate('tickets') // Populate tickets
        .sort({ date: 1 })
        .limit(8);
      res.json(upcomingEvents);
    } catch (err: any) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };

// @route   GET /api/events/:id
// @desc    Get event by ID
export const getEventById: RequestHandler = async (req, res): Promise<void> => {
  console.log(`[getEventById] Request received for Event ID: ${req.params.id}`);
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'tickets',
        populate: { path: 'userId', select: 'username email' }
      });

    console.log(`[getEventById] Result of findById and populate: ${event ? event.title : 'Event not found in DB'}`);

    if (!event) {
      console.warn(`[getEventById] Event with ID ${req.params.id} was not found in the database or could not be populated.`);
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    console.log(`[getEventById] Successfully fetched event: ${event._id} - ${event.title}`);
    res.json(event);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
      console.error(`[getEventById] Invalid Event ID format: ${req.params.id}. Error: ${err.message}`);
      res.status(404).json({ msg: 'Event not found (Invalid ID format)' });
      return;
    }
    console.error(`[getEventById] Server Error processing request for ID ${req.params.id}:`, err); // Log cả object lỗi
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
    // Xóa tất cả các vé liên quan đến sự kiện này
    await Ticket.deleteMany({ eventId: event._id });
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
// @desc    Unregister from an event (by deleting their ticket)
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
      
      const deletedTicket = await Ticket.findOneAndDelete({ eventId: event._id, userId: userId });

      if (!deletedTicket) {
          res.status(400).json({ msg: 'You are not registered for this event or your ticket could not be found.' });
          return;
      }

      event.tickets = event.tickets.filter(
        (ticketId) => ticketId.toString() !== (deletedTicket._id as mongoose.Types.ObjectId).toString() //
      );
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

// @route   POST /api/events/:id/unregister
// @desc    Unregister from an event (by deleting their ticket)
// export const unregisterFromEvent: RequestHandler = async (req, res): Promise<void> => {
//     try {
//       const userId = req.user?.id;
//       if (!userId) {
//           res.status(401).json({ msg: 'Not authorized, no user ID' });
//           return;
//       }
//       const event = await Event.findById(req.params.id);
//       if (!event) {
//         res.status(404).json({ msg: 'Event not found' });
//         return;
//       }
      
//       const deletedTicket = await Ticket.findOneAndDelete({ eventId: event._id, userId: userId });

//       if (!deletedTicket) {
//           res.status(400).json({ msg: 'You are not registered for this event or your ticket could not be found.' });
//           return;
//       }

//       event.tickets = event.tickets.filter(
//         (ticketId) => ticketId.toString() !== deletedTicket._id.toString()
//       );
//       await event.save();

//       res.json({ msg: 'Successfully unregistered from the event', event });
//     } catch (err: any) {
//       if (err.kind === 'ObjectId') {
//           res.status(404).json({ msg: 'Event or User not found (Invalid ID)' });
//           return;
//       }
//       res.status(500).send('Server Error');
//     }
// };

// @route   GET /api/events/my-events
// @desc    Get all events created by the logged-in user
export const getMyEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }
    const myEvents = await Event.find({ organizerId: userId })
      .populate('tickets') // Populate tickets for organizer's events
      .sort({ date: -1 });
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
    const events = await Event.find({ organizerId: organizerId })
      .populate('tickets') // Populate tickets for organizer's events
      .sort({ date: -1 });
    res.json(events);
  } catch (err: any) {
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'Organizer not found' });
        return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/events/:id/purchase-ticket
// @desc    Simulate ticket purchase for a PAID event and generate ticket
export const purchaseTicket: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);
    const user = await User.findById(userId);

    if (!event || !user) {
      res.status(404).json({ msg: 'Event or User not found' });
      return;
    }

    if (event.isFree) {
      res.status(400).json({ msg: 'This is a free event. Please use the registration flow.' });
      return;
    }

    if (!event.price || typeof event.price.amount !== 'number' || typeof event.price.currency !== 'string') {
        res.status(400).json({ msg: 'Event price information is missing or invalid in database.' });
        return;
    }

    const existingTicket = await Ticket.findOne({ eventId: event._id, userId: userId });
    if (existingTicket) {
        res.status(400).json({ msg: 'You have already purchased a ticket for this event.' });
        return;
    }

    const currentTicketsCount = await Ticket.countDocuments({ eventId: event._id });
    if (event.capacity && currentTicketsCount >= event.capacity) {
        res.status(400).json({ msg: 'Event is full.' });
        return;
    }

    const ticketCode = uuidv4();
    const qrCodeData = `Ticket Code: ${ticketCode}\nEvent ID: ${event._id}\nUser ID: ${user._id}\nPaid: Yes`;
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

    event.tickets.push(newTicket._id as mongoose.Types.ObjectId); //
    await event.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Xác nhận mua vé sự kiện: ${event.title}`,
      html: `
        <p>Xin chào ${user.username},</p>
        <p>Cảm ơn bạn đã mua vé cho sự kiện <strong>${event.title}</strong>.</p>
        <p><strong>Ngày:</strong> ${event.date.toLocaleDateString('vi-VN')}</p>
        <p><strong>Thời gian:</strong> ${event.time}</p>
        <p><strong>Địa điểm:</strong> ${event.location}, ${event.address || ''}</p>
        <p><strong>Giá vé:</strong> ${event.price.amount.toLocaleString('vi-VN')} ${event.price.currency.toUpperCase()}</p>
        <p>Mã vé của bạn: <strong>${ticketCode}</strong></p>
        <p>Vui lòng mang theo QR code này khi đến sự kiện để check-in:</p>
        <img src="${qrCodeUrl}" alt="QR Code của bạn" style="width:200px; height:200px; display:block; margin: 10px 0;"/>
        <p>Bạn có thể xem vé của mình tại tài khoản của bạn trên website của chúng tôi.</p>
        <p>Chúng tôi mong chờ được gặp bạn!</p>
        <p>Trân trọng,<br/>Đội ngũ ${event.organizer?.name || 'Tổ chức sự kiện'}</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(201).json({ msg: 'Ticket purchased successfully and sent to email!', ticket: newTicket });
  } catch (err: any) {
    console.error("Error in purchaseTicket (demo):", err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/my-tickets
// @desc    Get all tickets for the logged-in user
export const getMyTickets: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const tickets = await Ticket.find({ userId: userId })
      .populate('eventId') // Populate thông tin sự kiện liên quan
      .sort({ purchaseDate: -1 });

    const formattedTickets = tickets.map(ticket => {
      const event = ticket.eventId as unknown as IEvent;
      if (!event) { // Xử lý trường hợp event bị xóa hoặc không populate được
        console.warn(`Event not found for ticket ${ticket._id}. It might have been deleted.`);
        return null; // Bỏ qua các vé không có sự kiện liên quan
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
          time: event.time,
          location: event.location,
          address: event.address,
          image: event.image,
          isFree: event.isFree, // Đảm bảo isFree được truyền
          price: event.isFree ? 'Free' : `${event.price?.amount?.toLocaleString('vi-VN')} ${event.price?.currency?.toUpperCase()}`,
          category: event.category,
          organizerName: event.organizer?.name || 'Unknown Organizer',
        },
      };
    }).filter(ticket => ticket !== null);

    res.json(formattedTickets);
  } catch (err: any) {
    console.error("Error in getMyTickets:", err.message);
    res.status(500).send('Server Error');
  }
};

export const getEventTickets: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const eventId = req.params.id; // Corrected: Use req.params.id as eventId

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to view tickets for this event.' });
      return;
    }

    const tickets = await Ticket.find({ eventId: eventId })
      .populate('userId', 'username email') // Populate userId và chỉ lấy username, email
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
        user: user ? { id: user._id, username: user.username, email: user.email } : null,
      };
    });

    res.json(formattedTickets);
  } catch (err: any) {
    console.error('Error fetching event tickets:', err.message);
    res.status(500).send('Server Error');
  }
};