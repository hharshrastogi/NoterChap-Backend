import mongoose, { Document, Schema } from 'mongoose';
import { z } from "zod";

// User Schema and Model
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  profileImageUrl: { type: String },
}, {
  timestamps: true,
});

// Don't return password in JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export const User = mongoose.model<IUser>('User', userSchema);

// Note Schema and Model
export interface INote extends Document {
  _id: string;
  userId: string;
  title: string;
  description: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>({
  userId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: Number, required: true, min: 1, max: 5 },
}, {
  timestamps: true,
});

export const Note = mongoose.model<INote>('Note', noteSchema);

// Zod validation schemas
export const insertNoteSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.number().min(1).max(5),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type UpsertUser = Partial<IUser>;
