// reservationController.js - Handles booking and cancellations with transactions and IDOR safety
import mongoose from 'mongoose';
import TimeSlot from '../models/TimeSlot.js';
import Reservation from '../models/Reservation.js';
import { emitCapacityUpdate } from '../socket.js';

// POST /api/reservations - Book tickets with MongoDB transaction
export async function createReservation(req, res) {
  const { slotId, quantity } = req.body;
  const userId = req.user.userId;

  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    return res.status(400).json({ error: 'Invalid slotId format' });
  }

  // Under high concurrency (e.g., 500 simultaneous requests on the same slot),
  // MongoDB WiredTiger throws TransientTransactionError (WriteConflict).
  // A retry loop with jitter resolves the conflict cleanly without dropping requests.
  const MAX_RETRIES = 25;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    let isSoldOut = false;
    let reservation = null;
    let remainingTickets = 0;

    try {
      await session.withTransaction(async () => {
        // ATOMIC GUARD: Only decrement tickets IF availableTickets >= requested quantity
        const slot = await TimeSlot.findOneAndUpdate(
          { _id: slotId, availableTickets: { $gte: quantity } },
          { $inc: { availableTickets: -quantity, version: 1 } },
          { new: true, session }
        );

        if (!slot) {
          isSoldOut = true;
          // Aborting inside withTransaction cancels this attempt
          await session.abortTransaction();
          return;
        }

        const [createdRes] = await Reservation.create(
          [
            {
              userId,
              slotId,
              quantity,
              status: 'confirmed',
            },
          ],
          { session }
        );

        reservation = createdRes;
        remainingTickets = slot.availableTickets;
      });

      if (isSoldOut) {
        return res.status(409).json({ error: 'Sold out or insufficient tickets available' });
      }

      if (reservation) {
        // Emit real-time event AFTER transaction is committed (never inside it)
        emitCapacityUpdate(slotId, remainingTickets);

        return res.status(201).json({
          message: 'Booking confirmed',
          reservation,
          availableTickets: remainingTickets,
        });
      }
    } catch (err) {
      const isTransient =
        err.hasErrorLabel?.('TransientTransactionError') ||
        err.errorLabels?.has?.('TransientTransactionError') ||
        err.message?.includes('WriteConflict');

      if (isTransient && attempt < MAX_RETRIES) {
        // Randomized jitter backoff to disperse the thundering herd
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 40 + 10));
        continue;
      }

      console.error('createReservation error:', err.message);
      return res.status(500).json({ error: 'Booking failed due to server error' });
    } finally {
      await session.endSession();
    }
  }

  return res.status(500).json({ error: 'Server busy, could not complete transaction' });
}

// DELETE /api/reservations/:id - Cancel a reservation with IDOR protection
export async function cancelReservation(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid reservation id format' });
  }

  const MAX_RETRIES = 10;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();
    let notFound = false;
    let cancelledRes = null;
    let updatedAvailable = 0;

    try {
      await session.withTransaction(async () => {
        // IDOR FIX: Filter by BOTH _id AND req.user.userId
        const reservation = await Reservation.findOne({
          _id: id,
          userId,
          status: 'confirmed',
        }).session(session);

        if (!reservation) {
          notFound = true;
          await session.abortTransaction();
          return;
        }

        reservation.status = 'cancelled';
        await reservation.save({ session });

        const slot = await TimeSlot.findByIdAndUpdate(
          reservation.slotId,
          { $inc: { availableTickets: reservation.quantity, version: 1 } },
          { new: true, session }
        );

        cancelledRes = reservation;
        updatedAvailable = slot?.availableTickets;
      });

      if (notFound) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      if (cancelledRes) {
        emitCapacityUpdate(cancelledRes.slotId, updatedAvailable);
        return res.status(200).json({
          message: 'Reservation cancelled successfully',
          reservation: cancelledRes,
          availableTickets: updatedAvailable,
        });
      }
    } catch (err) {
      const isTransient =
        err.hasErrorLabel?.('TransientTransactionError') ||
        err.errorLabels?.has?.('TransientTransactionError') ||
        err.message?.includes('WriteConflict');

      if (isTransient && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 40 + 10));
        continue;
      }

      console.error('cancelReservation error:', err.message);
      return res.status(500).json({ error: 'Cancellation failed due to server error' });
    } finally {
      await session.endSession();
    }
  }

  return res.status(500).json({ error: 'Server busy, could not cancel' });
}

// GET /api/reservations/me - List logged-in user's reservations
export async function getMyReservations(req, res) {
  try {
    const reservations = await Reservation.find({ userId: req.user.userId })
      .populate({
        path: 'slotId',
        populate: { path: 'siteId', select: 'name location description' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ reservations });
  } catch (err) {
    console.error('getMyReservations error:', err);
    return res.status(500).json({ error: 'Failed to fetch reservations' });
  }
}

// GET /api/admin/capacity - Admin view of all slot capacities
export async function getAdminCapacity(_req, res) {
  try {
    const slots = await TimeSlot.find()
      .populate('siteId', 'name location')
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({ slots });
  } catch (err) {
    console.error('getAdminCapacity error:', err);
    return res.status(500).json({ error: 'Failed to fetch slot capacities' });
  }
}
