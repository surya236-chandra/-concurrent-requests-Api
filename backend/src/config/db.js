
// db.js - sets up the Mongoose connection to MongoDB
// We export a function so app.js can await it before starting the server

import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    // Fail loudly - a missing URI is always a config mistake
    throw new Error('MONGO_URI is not set in .env');
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
