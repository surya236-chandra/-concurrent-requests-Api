// Site.js - a heritage site that has bookable time slots
// Simple model: name, where it is, a short description

import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Site', siteSchema);
