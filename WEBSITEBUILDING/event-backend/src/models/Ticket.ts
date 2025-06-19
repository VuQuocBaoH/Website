// src/models/Ticket.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId?: string; // Mã đơn hàng từ Momo/Stripe (nếu có)
  ticketCode: string; // Mã code duy nhất cho vé (UUID)
  qrCodeUrl?: string; // URL tới hình ảnh QR code (nếu lưu trên Cloudinary/S3) hoặc base64 data
  purchaseDate: Date;
  isPaid: boolean; // True nếu sự kiện có phí và đã thanh toán
  isFreeTicket: boolean; // True nếu là vé miễn phí
  checkInStatus: 'pending' | 'checkedIn' | 'noShow';
  checkInTime?: Date;
  // Bạn có thể thêm các trường khác như:
  // ticketType?: 'standard' | 'VIP' | 'earlyBird';
  // pricePaid?: { amount: number; currency: string; }; // Giá thực tế đã trả sau giảm giá
}

const TicketSchema: Schema = new Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String }, // Optional, for linking to payment gateway's order ID
  ticketCode: { type: String, required: true, unique: true }, // Unique identifier for each ticket
  qrCodeUrl: { type: String }, // URL to the QR code image
  purchaseDate: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false },
  isFreeTicket: { type: Boolean, default: true }, // Default to true, updated based on event
  checkInStatus: { type: String, enum: ['pending', 'checkedIn', 'noShow'], default: 'pending' },
  checkInTime: { type: Date },
});

const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
export default Ticket;