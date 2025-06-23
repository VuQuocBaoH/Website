// event-backend/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  passwordResetToken?: string; 
  passwordResetExpires?: Date; 
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  passwordResetToken: String, 
  passwordResetExpires: Date, 
});

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;