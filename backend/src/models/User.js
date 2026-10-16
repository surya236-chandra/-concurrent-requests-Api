// User.js - who can log in and book tickets
// We store a passwordHash, NEVER the plain-text password

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,      // one account per email
      lowercase: true,   // always store as lowercase so "A@b.com" == "a@b.com"
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // Role is ALWAYS set by the server, never trusted from the client.
    // Admin users only come from the seed script.
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

export default mongoose.model('User', userSchema);
