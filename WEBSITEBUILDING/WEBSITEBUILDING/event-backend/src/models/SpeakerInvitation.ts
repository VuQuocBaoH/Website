// event-backend/src/models/SpeakerInvitation.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISpeakerInvitation extends Document {
  eventId: mongoose.Types.ObjectId;
  speakerId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  invitationDate: Date;
  responseDate?: Date;
  message?: string; // Lời nhắn từ người tổ chức
}

const SpeakerInvitationSchema: Schema = new Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  speakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  invitationDate: { type: Date, default: Date.now },
  responseDate: { type: Date },
  message: { type: String },
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
});

const SpeakerInvitation = mongoose.model<ISpeakerInvitation>('SpeakerInvitation', SpeakerInvitationSchema);
export default SpeakerInvitation;