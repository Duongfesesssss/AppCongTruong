import mongoose, { Schema } from "mongoose";

export type UserDocument = {
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    refreshTokenHash: { type: String },
    avatarUrl: { type: String },
    bio: { type: String, trim: true },
    phone: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<UserDocument>("User", userSchema);
