import { Request, Response, RequestHandler } from 'express';
import Event, { IEvent } from '../models/Event';
import User from '../models/User'; // Import User model để quản lý registeredAttendees
import mongoose from 'mongoose'; // Để sử dụng mongoose.Types.ObjectId
import DiscountCode from '../models/DiscountCode';
import Stripe from 'stripe';

// @route   POST /api/events
// @desc    Create a new event
// @access  Private (Chỉ người dùng đã đăng nhập mới tạo được sự kiện)
export const createEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id; // Lấy ID người dùng từ token
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const {
      title, date, time, location, address, image, price, category,
      description, longDescription, capacity, organizerName, organizerImage, organizerDescription,
      schedule 
    } = req.body;

    const eventDate = new Date(date);

    const organizer = {
        name: organizerName || 'Unknown Organizer',
        image: organizerImage,
        description: organizerDescription
    };

    const newEvent = new Event({
      title,
      date: eventDate,
      time,
      location,
      address,
      image,
      price: price || 'Free',
      category,
      organizer,
      organizerId: new mongoose.Types.ObjectId(userId), // <-- LƯU ID CỦA NGƯỜI TẠO
      description,
      longDescription: longDescription || description,
      capacity: capacity ? parseInt(capacity) : undefined,
      status: 'active',
      schedule: schedule || []
    }) as IEvent;

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events
// @desc    Get all events
// @access  Public
export const getEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { search, category, dateFilter, priceMin, priceMax } = req.query;
    let query: any = {};

    // Thêm điều kiện tìm kiếm (search term)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Thêm điều kiện lọc theo category
    if (category && category !== 'All') { // 'All' có thể là một lựa chọn trong frontend
      query.category = category;
    }

    // Logic lọc theo dateFilter
    if (dateFilter) {
      const today = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case 'Today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(today.setHours(23, 59, 59, 999));
          query.date = { $gte: startDate, $lte: endDate };
          break;
        case 'Tomorrow':
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'This Weekend':
            // Tạm bỏ qua cho nhanh, hoặc có thể dùng thư viện date-fns ở backend
            break;
        case 'This Week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'Next Month':
            startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
            break;
        case 'All Upcoming':
            startDate = new Date(today.setHours(0,0,0,0));
            query.date = { $gte: startDate };
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
// @desc    Get featured events for homepage
// @access  Public
export const getFeaturedEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const featuredEvents = await Event.find({ isFeatured: true }).sort({ date: 1 }).limit(4); // Lấy 4 sự kiện nổi bật
    res.json(featuredEvents);
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET /api/events/upcoming
// @desc    Get upcoming events for homepage
// @access  Public
export const getUpcomingEvents: RequestHandler = async (req, res): Promise<void> => {
    try {
      // Lấy các sự kiện có ngày trong tương lai
      const today = new Date();
      const upcomingEvents = await Event.find({ date: { $gte: today }, isUpcoming: true }).sort({ date: 1 }).limit(4); // Lấy 4 sự kiện sắp tới
      res.json(upcomingEvents);
    } catch (err: any) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };


// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Public
export const getEventById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }
    res.json(event);
  } catch (err: any) {
    console.error(err.message);
    // Kiểm tra nếu ID không hợp lệ của MongoDB
    if (err.kind === 'ObjectId') {
      res.status(404).json({ msg: 'Event not found (Invalid ID)' });
      return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Chỉ người tổ chức sự kiện hoặc admin)
// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Chỉ người tổ chức sự kiện hoặc admin)
export const updateEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to update this event' });
      return;
    }

    const {
        title, date, time, location, address, image, price, category,
        description, longDescription, capacity, organizerName, organizerImage, organizerDescription,
        isFeatured, isUpcoming, status, schedule
    } = req.body;

    const updatedEventData: Partial<IEvent> = {
        title,
        date: date ? new Date(date) : undefined,
        time,
        location,
        address,
        image,
        price,
        category,
        description,
        longDescription: longDescription || description || event.longDescription,
        capacity: capacity ? parseInt(capacity) : undefined,
        isFeatured,
        isUpcoming,
        status,
        schedule
    };

    if (organizerName || organizerImage || organizerDescription) {
        (updatedEventData as any).organizer = {
            name: organizerName || event.organizer.name,
            image: organizerImage || event.organizer.image,
            description: organizerDescription || event.organizer.description
        };
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updatedEventData },
      { new: true, runValidators: true }
    );

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

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Chỉ người tổ chức sự kiện hoặc admin)
export const deleteEvent: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role; // Lấy role từ token
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    // KIỂM TRA QUYỀN: Chỉ người tạo sự kiện HOẶC admin mới được xóa
    if (event.organizerId.toString() !== userId && userRole !== 'admin') {
      res.status(403).json({ msg: 'Not authorized to delete this event' });
      return;
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Event removed' });
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
// @desc    Register for an event
// @access  Private (Người dùng đã đăng nhập)
export const registerForEvent: RequestHandler = async (req, res): Promise<void> => {
  // try {
  //   // Lấy userId từ token đã được xác thực (sẽ được thêm vào bởi Auth middleware)
  //   const userId = (req as any).user?.id; 
    try {
    const userId = req.user?.id;
    const { discountCode } = req.body;

    if (!userId) {
        res.status(401).json({ msg: 'Not authorized, no user ID' });
        return;
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      res.status(404).json({ msg: 'Event not found' });
      return;
    }

    if (event.organizerId && event.organizerId.toString() === userId) {
      res.status(400).json({ msg: 'Người tổ chức không thể đăng ký sự kiện của chính mình.' });
      return;
    }

    // Kiểm tra xem người dùng đã đăng ký chưa
    if (event.registeredAttendees.includes(new mongoose.Types.ObjectId(userId))) {
      res.status(400).json({ msg: 'You are already registered for this event' });
      return;
    }

    // Kiểm tra sức chứa
    if (event.capacity && event.registeredAttendees.length >= event.capacity) {
        res.status(400).json({ msg: 'Event is full' });
        return;
    }

    let finalPrice = parseFloat(event.price.replace('$', '')); 
    let appliedDiscount = null;

    if (discountCode && discountCode.trim() !== '' && event.price !== 'Free') {
        const foundCode = await DiscountCode.findOne({ code: discountCode.toUpperCase() });

        if (!foundCode || !foundCode.isActive || (foundCode.expirationDate && foundCode.expirationDate < new Date())) {
            res.status(400).json({ msg: 'Invalid or expired discount code.' });
            return;
        }
        if (foundCode.usageLimit && foundCode.timesUsed >= foundCode.usageLimit) {
            res.status(400).json({ msg: 'Discount code has reached its usage limit.' });
            return;
        }

        // Áp dụng giảm giá
        if (foundCode.type === 'percentage') {
            finalPrice = finalPrice * (1 - foundCode.value / 100);
        } else if (foundCode.type === 'fixed') {
            finalPrice = finalPrice - foundCode.value;
        }
        if (finalPrice < 0) finalPrice = 0; // Đảm bảo giá không âm

        // Cập nhật số lần sử dụng mã giảm giá
        foundCode.timesUsed += 1;
        await foundCode.save();
        appliedDiscount = foundCode; // Lưu mã đã áp dụng
    }

    // Thêm người dùng vào danh sách đăng ký
    event.registeredAttendees.push(new mongoose.Types.ObjectId(userId)); // Thêm ObjectId

    await event.save();
    res.json({ msg: 'Successfully registered for the event', event,
      appliedDiscount: appliedDiscount ? { code: appliedDiscount.code, value: appliedDiscount.value, type: appliedDiscount.type, finalPrice } : undefined,
      finalEventPrice: finalPrice
     });
  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'Event or User not found (Invalid ID)' });
        return;
    }
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/events/:id/unregister
// @desc    Unregister from an event
// @access  Private (Người dùng đã đăng nhập)
export const unregisterFromEvent: RequestHandler = async (req, res): Promise<void> => {
    try {
      const userId = (req as any).user?.id; // Giả định req.user.id tồn tại sau khi xác thực

      if (!userId) {
          res.status(401).json({ msg: 'Not authorized, no user ID' });
          return;
      }

      const event = await Event.findById(req.params.id);

      if (!event) {
        res.status(404).json({ msg: 'Event not found' });
        return;
      }

      // Lọc người dùng khỏi danh sách đăng ký
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
      console.error(err.message);
      if (err.kind === 'ObjectId') {
          res.status(404).json({ msg: 'Event or User not found (Invalid ID)' });
          return;
      }
      res.status(500).send('Server Error');
    }
  };

// @route   GET /api/events/my-events
// @desc    Get all events created by the logged-in user
// @access  Private
export const getMyEvents: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ msg: 'User not authenticated' });
      return;
    }

    // Tìm tất cả các sự kiện có organizerId khớp với ID của người dùng đang đăng nhập
    const myEvents = await Event.find({ organizerId: userId }).sort({ date: -1 }); // Sắp xếp theo ngày gần nhất

    if (!myEvents) {
        res.status(404).json({ msg: 'No events found for this user.' });
        return;
    }

    res.json(myEvents);

  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getEventsByOrganizer: RequestHandler = async (req, res): Promise<void> => {
  try {
    const organizerId = req.params.organizerId;

    const events = await Event.find({ organizerId: organizerId }).sort({ date: -1 });

    res.json(events);

  } catch (err: any) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
        res.status(404).json({ msg: 'Organizer not found' });
        return; // Bạn có thể giữ lại return; không có giá trị để thoát khỏi hàm sớm
    }
    res.status(500).send('Server Error');
  }
};
