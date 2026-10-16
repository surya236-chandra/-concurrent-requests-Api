// components/SlotCard.jsx - Interactive card for a single bookable time slot
import React, { useState } from 'react';

export default function SlotCard({ slot, onBook, isBookingThisSlot }) {
  const [quantity, setQuantity] = useState(1);
  const isSoldOut = slot.availableTickets === 0;

  const percentLeft = Math.round((slot.availableTickets / slot.totalCapacity) * 100);

  let statusClass = 'status-available';
  if (isSoldOut) {
    statusClass = 'status-soldout';
  } else if (percentLeft <= 25) {
    statusClass = 'status-low';
  } else if (percentLeft <= 60) {
    statusClass = 'status-medium';
  }

  const handleBook = () => {
    if (quantity > 0 && quantity <= slot.availableTickets) {
      onBook(slot._id, quantity);
    }
  };

  return (
    <div className={`slot-card ${isSoldOut ? 'sold-out' : ''}`}>
      <div className="slot-card-header">
        <div className="slot-time">
          <span className="time-icon">⏰</span>
          <span className="time-text">
            {slot.startTime} – {slot.endTime}
          </span>
        </div>
        <span className={`badge-capacity ${statusClass}`}>
          {isSoldOut ? 'Sold Out' : `${slot.availableTickets} Left`}
        </span>
      </div>

      <div className="capacity-bar-container">
        <div
          className={`capacity-bar-fill ${statusClass}`}
          style={{ width: `${percentLeft}%` }}
        ></div>
      </div>

      <div className="capacity-details">
        <span>Capacity: {slot.totalCapacity}</span>
        <span>Available: {slot.availableTickets}</span>
      </div>

      <div className="slot-card-actions">
        {!isSoldOut ? (
          <>
            <div className="quantity-control">
              <label htmlFor={`qty-${slot._id}`}>Qty:</label>
              <select
                id={`qty-${slot._id}`}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={isBookingThisSlot}
                className="select-qty"
              >
                {Array.from(
                  { length: Math.min(10, slot.availableTickets) },
                  (_, i) => i + 1
                ).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBook}
              disabled={isBookingThisSlot}
              className="btn btn-primary btn-book"
            >
              {isBookingThisSlot ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span> Booking...
                </span>
              ) : (
                `Book ${quantity} Ticket${quantity > 1 ? 's' : ''}`
              )}
            </button>
          </>
        ) : (
          <div className="sold-out-notice">
            <span>No tickets available for this window</span>
          </div>
        )}
      </div>
    </div>
  );
}
