// src/models/Event.ts
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
  isFree: boolean;
  price?: IPrice;
  category: string;
  organizer: IOrganizer;
  organizerId: mongoose.Types.ObjectId;
  description: string;
  longDescription?: string;
  capacity?: number;
  // registeredAttendees: mongoose.Types.ObjectId[]; 
  tickets: mongoose.Types.ObjectId[]; 
  status: 'active' | 'cancelled' | 'completed';
  schedule?: IScheduleItem[];
}

const priceSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ['vnd', 'usd'],
    required: true,
  },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String },
  description: { type: String, required: true },
  longDescription: { type: String },
  capacity: { type: Number },
  isFree: { type: Boolean, default: true },
  price: {
    type: priceSchema,
    required: function (this: IEvent) {
      return this.isFree === false;
    },
  },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organizer: {
    name: String,
    description: String,
  },
  schedule: [
    {
      time: String,
      title: String,
      description: String,
    },
  ],
  // tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }], // 
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }], //
  isFeatured: { type: Boolean, default: false },
  isUpcoming: { type: Boolean, default: false },
  status: { type: String, default: "active" },
}, {
  timestamps: true,
});

const Event = mongoose.model<IEvent>('Event', eventSchema);
export default Event;