// slotController.js - List bookable time slots
import mongoose from 'mongoose';
import TimeSlot from '../models/TimeSlot.js';

// GET /api/slots?siteId=...&date=...
export async function getSlots(req, res) {
  try {
    const { siteId, date } = req.query;

    const filter = {};
    if (siteId) {
      if (!mongoose.Types.ObjectId.isValid(siteId)) {
        return res.status(400).json({ error: 'Invalid siteId format' });
      }
      filter.siteId = siteId;
    }
    if (date) {
      filter.date = date;
    }

    const slots = await TimeSlot.find(filter)
      .populate('siteId', 'name location')
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({ slots });
  } catch (err) {
    console.error('getSlots error:', err);
    return res.status(500).json({ error: 'Failed to fetch slots' });
  }
}
