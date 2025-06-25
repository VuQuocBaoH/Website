
import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscountCode extends Document {
  code: string; // Mã giảm giá, ví dụ: "SALE20"
  value: number; // Giá trị giảm giá (ví dụ: 20 cho 20% hoặc 20000 cho 20,000 VND)
  type: 'percentage' | 'fixed'; // Loại giảm giá (phần trăm hay cố định)
  expirationDate?: Date; // Ngày hết hạn (optional)
  isActive: boolean; // Trạng thái hoạt động
  usageLimit?: number; // Giới hạn số lần sử dụng (optional)
  timesUsed: number; // Số lần đã sử dụng
  createdBy: mongoose.Types.ObjectId; // ID người tạo (admin)
  createdAt: Date;
  updatedAt: Date;
}

const DiscountCodeSchema: Schema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // Lưu mã dưới dạng chữ hoa
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  expirationDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  usageLimit: {
    type: Number,
    min: 1,
  },
  timesUsed: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

DiscountCodeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const DiscountCode = mongoose.model<IDiscountCode>('DiscountCode', DiscountCodeSchema);
export default DiscountCode;