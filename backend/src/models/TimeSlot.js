// TimeSlot.js - one bookable time window at a site on a specific date
//
// KEY DESIGN DECISIONS:
// 1. availableTickets is the field we atomically decrement during booking.
//    It must NEVER go below 0.
// 2. The unique index on (siteId, date, startTime) prevents duplicate slots
//    from being seeded or created twice by accident.
// 3. version is used for optimistic concurrency if we ever need it,
//    but the real safety comes from the atomic $inc in Phase 4.

import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
    },
    // Store date as a plain string "YYYY-MM-DD" so queries like
    // ?date=2026-10-17 are simple string comparisons — no timezone surprises.
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String, // "09:00"
      required: true,
    },
    endTime: {
      type: String, // "11:00"
      required: true,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    // This field is decremented atomically in the booking transaction.
    // It starts equal to totalCapacity and never goes below 0.
    availableTickets: {
      type: Number,
      required: true,
      min: 0,
    },
    // version lets us detect stale reads if we ever need optimistic locking
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Unique index: same site cannot have two slots at the same time on the same date
timeSlotSchema.index({ siteId: 1, date: 1, startTime: 1 }, { unique: true });

export default mongoose.model('TimeSlot', timeSlotSchema);
