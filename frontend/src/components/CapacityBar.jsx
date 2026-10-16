// components/CapacityBar.jsx - Real-time color-coded capacity bar for admin overview
import React from 'react';

export default function CapacityBar({ availableTickets, totalCapacity }) {
  const bookedTickets = Math.max(0, totalCapacity - availableTickets);
  const percentAvailable = Math.round((availableTickets / totalCapacity) * 100);
  const percentBooked = 100 - percentAvailable;

  let colorClass = 'cap-green'; // Plenty of tickets available
  if (availableTickets === 0) {
    colorClass = 'cap-red sold-out';
  } else if (percentAvailable <= 20) {
    colorClass = 'cap-red'; // Critical low capacity
  } else if (percentAvailable <= 50) {
    colorClass = 'cap-amber'; // Moderate capacity
  }

  return (
    <div className="admin-capacity-card">
      <div className="admin-capacity-header">
        <span className="capacity-numbers">
          <strong>{availableTickets}</strong> / {totalCapacity} Left
        </span>
        <span className={`capacity-badge ${colorClass}`}>
          {availableTickets === 0 ? 'SOLD OUT' : `${percentAvailable}% Available`}
        </span>
      </div>

      <div className="admin-progress-track">
        <div
          className={`admin-progress-fill ${colorClass}`}
          style={{ width: `${percentAvailable}%` }}
        ></div>
      </div>

      <div className="admin-capacity-subtext">
        <span>{bookedTickets} booked</span>
        <span>{totalCapacity} total</span>
      </div>
    </div>
  );
}
