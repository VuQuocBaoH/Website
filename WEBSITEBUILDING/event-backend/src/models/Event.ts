import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizer {
  name: string;
  image?: string;
  description?: string;
}

export interface IScheduleItem {
  time: string; 
  title: string; 
  description?: string; 
}

export interface IPrice {
  amount: number;
  currency: 'vnd' | 'usd';
}

export interface IEvent extends Document {
  title: string;
  date: Date;
  time: string;
  location: string;
  address?: string;
  image: string;
  price: string;
  category: string;
  organizer: IOrganizer;
  organizerId: mongoose.Types.ObjectId;
  description: string;
  longDescription?: string;
  capacity?: number;
  registeredAttendees: mongoose.Types.ObjectId[];
  isFeatured?: boolean;
  isUpcoming?: boolean;
  status: 'active' | 'cancelled' | 'completed';
  schedule?: IScheduleItem[]; // <-- THÊM TRƯỜNG NÀY CHO LỊCH TRÌNH
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    default: 'Free',
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  organizer: {
    name: { type: String, required: true },
    image: { type: String },
    description: { type: String },
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  longDescription: {
    type: String,
  },
  capacity: {
    type: Number,
  },
  registeredAttendees: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    default: [],
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isUpcoming: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active',
  },
  schedule: [ // <-- THÊM TRƯỜNG NÀY CHO LỊCH TRÌNH (Array of Objects)
    {
      time: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

EventSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Event = mongoose.model<IEvent>('Event', EventSchema);
export default Event;