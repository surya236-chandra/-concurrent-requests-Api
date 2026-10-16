// reset-db.js - Resets all reservations and restores all 63 slots back to 50 tickets
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Site from '../src/models/Site.js';
import TimeSlot from '../src/models/TimeSlot.js';
import Reservation from '../src/models/Reservation.js';
import { seedIfEmpty } from './seed.js';

async function resetDB() {
  console.log('🔄 Connecting to MongoDB to reset database...');
  await connectDB();

  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    Reservation.deleteMany({}),
    TimeSlot.deleteMany({}),
    Site.deleteMany({}),
    User.deleteMany({}),
  ]);

  console.log('🌱 Re-seeding database...');
  await seedIfEmpty();

  console.log('✅ Database reset complete! All 63 slots restored to capacity 50.');
  await mongoose.disconnect();
  process.exit(0);
}

resetDB().catch((err) => {
  console.error('❌ Failed to reset database:', err);
  process.exit(1);
});
