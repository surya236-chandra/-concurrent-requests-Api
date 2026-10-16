// Reservation.js - a confirmed (or cancelled) ticket booking
//
// IDOR NOTE (Phase 4):
// When cancelling, the DELETE handler always queries by BOTH _id AND userId
// (taken from the JWT). This means a user can ONLY cancel their OWN
// reservations — even if they guess someone else's reservation _id.
// IDOR = Insecure Direct Object Reference (accessing other users' data
// by guessing IDs).

import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

// Index on userId: fast lookup of "my reservations" (GET /api/reservations/me)
reservationSchema.index({ userId: 1 });

// Index on slotId: fast lookup of how many reservations a slot has
reservationSchema.index({ slotId: 1 });

export default mongoose.model('Reservation', reservationSchema);
