// seed.js - populates the database with demo data on first run
//
// Called automatically from app.js when the DB is empty.
// Creates: 1 admin, 1 normal user, 3 sites, 7 days of time slots (capacity 50 each).
// Prints login credentials to the console so you know what to use.

import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Site from '../src/models/Site.js';
import TimeSlot from '../src/models/TimeSlot.js';

export async function seedIfEmpty() {
  // Only seed if there are no users yet — prevents double-seeding on restart
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return; // DB already has data, skip

  console.log('🌱 Database is empty — running seed...');

  // --- Users ---
  const adminPassword = 'Admin@123';
  const userPassword = 'User@123';

  // bcrypt "salt rounds" = 10 means the hash is computed 2^10 = 1024 times.
  // More rounds = slower to crack if the DB is stolen, but also slower to hash.
  // 10 is the industry standard balance.
  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(userPassword, 10),
  ]);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@heritage.com',
    passwordHash: adminHash,
    role: 'admin', // ONLY the seed script sets role=admin
  });

  await User.create({
    name: 'Demo User',
    email: 'user@heritage.com',
    passwordHash: userHash,
    role: 'user', // normal visitor
  });

  // --- Sites ---
  const sites = await Site.insertMany([
    {
      name: 'Hampi Ruins',
      location: 'Karnataka, India',
      description: 'UNESCO World Heritage Site — ancient Vijayanagara Empire capital.',
    },
    {
      name: 'Ajanta Caves',
      location: 'Maharashtra, India',
      description: 'Rock-cut Buddhist cave monuments dating from the 2nd century BCE.',
    },
    {
      name: 'Qutb Minar',
      location: 'Delhi, India',
      description: 'Tallest brick minaret in the world, built in 1193.',
    },
  ]);

  // --- Time Slots: 7 days × 3 slots per day × 3 sites = 63 slots ---
  // Each slot has totalCapacity and availableTickets both set to 50
  const slots = [];
  const today = new Date();

  for (let day = 0; day < 7; day++) {
    const d = new Date(today);
    d.setDate(today.getDate() + day);
    // Format date as "YYYY-MM-DD" — simple string, no timezone issues
    const dateStr = d.toISOString().split('T')[0];

    for (const site of sites) {
      // Three visit windows per day per site
      const windows = [
        { start: '09:00', end: '11:00' },
        { start: '12:00', end: '14:00' },
        { start: '15:00', end: '17:00' },
      ];

      for (const w of windows) {
        slots.push({
          siteId: site._id,
          date: dateStr,
          startTime: w.start,
          endTime: w.end,
          totalCapacity: 50,
          availableTickets: 50, // starts full
          version: 0,
        });
      }
    }
  }

  await TimeSlot.insertMany(slots);

  // Print credentials clearly so the developer knows what to use
  console.log('');
  console.log('✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ADMIN   → admin@heritage.com / Admin@123');
  console.log('  USER    → user@heritage.com  / User@123');
  console.log(`  Sites   → ${sites.length} sites created`);
  console.log(`  Slots   → ${slots.length} time slots created`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}
