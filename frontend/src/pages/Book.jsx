// pages/Book.jsx - Main ticket reservation and user bookings page
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import SlotCard from '../components/SlotCard';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Book() {
  const { user } = useAuth();

  // State: Sites & Date
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayString);

  // State: Slots
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);

  // State: Notifications
  const [notification, setNotification] = useState(null);

  // State: My Bookings
  const [myReservations, setMyReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Real-time capacity update handler from Socket.io
  const handleCapacityUpdate = useCallback((payload) => {
    setSlots((prevSlots) =>
      prevSlots.map((slot) => {
        if (String(slot._id) === String(payload.slotId)) {
          return {
            ...slot,
            availableTickets: payload.availableTickets,
          };
        }
        return slot;
      })
    );
  }, []);

  const { joinSlot } = useSocket(handleCapacityUpdate);

  // 1. Fetch sites on component mount
  useEffect(() => {
    let isMounted = true;
    api
      .get('/sites')
      .then((res) => {
        if (!isMounted) return;
        const fetchedSites = res.data.sites || [];
        setSites(fetchedSites);
        if (fetchedSites.length > 0) {
          setSelectedSiteId(fetchedSites[0]._id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setNotification({
          type: 'error',
          message: 'Failed to load heritage sites.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch slots function
  const loadSlots = useCallback(async (siteId, date) => {
    if (!siteId || !date) return;

    setIsLoadingSlots(true);
    try {
      const res = await api.get(`/slots?siteId=${siteId}&date=${date}`);
      const fetchedSlots = res.data.slots || [];
      setSlots(fetchedSlots);

      // Join socket rooms for live updates
      fetchedSlots.forEach((slot) => joinSlot(slot._id));
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to load time slots for this date.',
      });
    } finally {
      setIsLoadingSlots(false);
    }
  }, [joinSlot]);

  // Trigger loadSlots only when selectedSiteId or selectedDate changes
  useEffect(() => {
    if (selectedSiteId && selectedDate) {
      loadSlots(selectedSiteId, selectedDate);
    }
  }, [selectedSiteId, selectedDate, loadSlots]);

  // 3. Fetch user's own reservations
  const loadReservations = useCallback(async () => {
    setIsLoadingReservations(true);
    try {
      const res = await api.get('/reservations/me');
      setMyReservations(res.data.reservations || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setIsLoadingReservations(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Handle Booking
  const handleBook = async (slotId, quantity) => {
    setNotification(null);
    setBookingSlotId(slotId);

    try {
      const res = await api.post('/reservations', { slotId, quantity });
      setNotification({
        type: 'success',
        message: `Success! Booked ${quantity} ticket(s). Remaining capacity: ${res.data.availableTickets}`,
      });

      // Refresh my reservations and reload current slots
      loadReservations();
      loadSlots(selectedSiteId, selectedDate);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Booking failed. Please try again.';
      setNotification({
        type: 'error',
        message: errorMsg,
      });

      // If 409 Sold out, auto-refresh slots to reflect real count
      if (err.response?.status === 409) {
        loadSlots(selectedSiteId, selectedDate);
      }
    } finally {
      setBookingSlotId(null);
    }
  };

  // Handle Cancellation
  const handleCancel = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    setNotification(null);
    setCancellingId(reservationId);

    try {
      await api.delete(`/reservations/${reservationId}`);
      setNotification({
        type: 'success',
        message: 'Reservation cancelled successfully. Tickets have been restored.',
      });

      loadReservations();
      loadSlots(selectedSiteId, selectedDate);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to cancel reservation.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const selectedSite = sites.find((s) => s._id === selectedSiteId);

  return (
    <div className="page-container booking-page">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <h1>Reserve Heritage Site Tickets</h1>
          <p className="subtitle">
            Choose a destination, select an entry window, and secure verified entry passes.
          </p>
        </div>
      </div>

      {/* Global Alert Notification */}
      {notification && (
        <div className={`alert alert-${notification.type}`} role="alert">
          <span className="alert-icon">
            {notification.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Step 1 & 2: Filter Controls */}
      <section className="filter-panel card-surface">
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="site-select">1. Select Heritage Site</label>
            <select
              id="site-select"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="form-control"
            >
              {sites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name} — {site.location}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-picker">2. Select Visit Date</label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control"
            />
          </div>
        </div>

        {selectedSite && (
          <div className="site-info-box">
            <span className="site-name-highlight">🏛️ {selectedSite.name}</span>
            <span className="site-desc">{selectedSite.description}</span>
          </div>
        )}
      </section>

      {/* Step 3: Slots Section */}
      <section className="slots-section">
        <div className="section-title-row">
          <h2>Available Time Slots ({selectedDate})</h2>
          <span className="realtime-badge">
            <span className="pulse-dot"></span> Live Sync Enabled
          </span>
        </div>

        {isLoadingSlots ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading available slots...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="empty-state card-surface">
            <p>No time slots scheduled for this site on {selectedDate}. Try selecting another date!</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map((slot) => (
              <SlotCard
                key={slot._id}
                slot={slot}
                onBook={handleBook}
                isBookingThisSlot={bookingSlotId === slot._id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Step 4: My Reservations List */}
      <section className="reservations-section">
        <div className="section-title-row">
          <h2>My Reservations</h2>
          <span className="count-badge">{myReservations.length} Total</span>
        </div>

        {isLoadingReservations ? (
          <div className="loading-state">
            <div className="spinner-small"></div>
            <p>Loading your reservations...</p>
          </div>
        ) : myReservations.length === 0 ? (
          <div className="empty-state card-surface">
            <p>You have no reservations yet. Select a slot above to book your first pass!</p>
          </div>
        ) : (
          <div className="reservations-list">
            {myReservations.map((res) => (
              <div key={res._id} className="reservation-item card-surface">
                <div className="res-details">
                  <div className="res-header">
                    <span className="res-site">
                      {res.slotId?.siteId?.name || 'Heritage Site'}
                    </span>
                    <span className={`badge-status ${res.status}`}>
                      {res.status}
                    </span>
                  </div>
                  <div className="res-meta">
                    <span>📅 {res.slotId?.date}</span>
                    <span>
                      ⏰ {res.slotId?.startTime} – {res.slotId?.endTime}
                    </span>
                    <span>🎟️ {res.quantity} Ticket(s)</span>
                  </div>
                </div>

                <div className="res-actions">
                  {res.status === 'confirmed' ? (
                    <button
                      onClick={() => handleCancel(res._id)}
                      disabled={cancellingId === res._id}
                      className="btn btn-cancel"
                    >
                      {cancellingId === res._id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  ) : (
                    <span className="cancelled-label">Cancelled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
