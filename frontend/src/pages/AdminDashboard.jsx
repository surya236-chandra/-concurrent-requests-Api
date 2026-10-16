// pages/AdminDashboard.jsx - Admin real-time capacity monitoring dashboard
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';
import { useSocket } from '../hooks/useSocket';
import CapacityBar from '../components/CapacityBar';

export default function AdminDashboard() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

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

  // Connects socket with admin JWT (backend automatically joins socket to 'admin' room)
  useSocket(handleCapacityUpdate);

  // Fetch all slot capacities across all sites
  const fetchAdminSlots = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/capacity');
      setSlots(res.data.slots || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch slot capacities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminSlots();
  }, [fetchAdminSlots]);

  // Unique sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      if (s.siteId?._id && !map.has(s.siteId._id)) {
        map.set(s.siteId._id, s.siteId.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  // Unique dates for filter dropdown
  const uniqueDates = useMemo(() => {
    const set = new Set(slots.map((s) => s.date).filter(Boolean));
    return Array.from(set).sort();
  }, [slots]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchSite =
        selectedSiteFilter === 'ALL' ||
        String(slot.siteId?._id) === String(selectedSiteFilter);
      const matchDate =
        !selectedDateFilter || slot.date === selectedDateFilter;
      return matchSite && matchDate;
    });
  }, [slots, selectedSiteFilter, selectedDateFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCap = 0;
    let totalAvailable = 0;
    let soldOutCount = 0;

    filteredSlots.forEach((slot) => {
      totalCap += slot.totalCapacity;
      totalAvailable += slot.availableTickets;
      if (slot.availableTickets === 0) {
        soldOutCount++;
      }
    });

    const totalBooked = totalCap - totalAvailable;
    const occupancyRate =
      totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

    return {
      totalSlots: filteredSlots.length,
      totalCapacity: totalCap,
      totalAvailable,
      totalBooked,
      occupancyRate,
      soldOutCount,
    };
  }, [filteredSlots]);

  return (
    <div className="page-container admin-page">
      {/* Page Header */}
      <div className="page-header admin-header-flex">
        <div>
          <h1>Capacity Monitor & Admin Console</h1>
          <p className="subtitle">
            Live real-time inventory management across all heritage sites and booking windows.
          </p>
        </div>
        <div className="admin-status-cluster">
          <span className="realtime-badge live-pulse">
            <span className="pulse-dot"></span> Admin WebSocket Stream
          </span>
          <button onClick={fetchAdminSlots} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Stats Cards */}
      <section className="stats-row">
        <div className="stat-card card-surface">
          <span className="stat-label">Active Slots</span>
          <span className="stat-value">{metrics.totalSlots}</span>
          <span className="stat-detail">Across all sites</span>
        </div>
        <div className="stat-card card-surface">
          <span className="stat-label">Tickets Booked</span>
          <span className="stat-value text-accent">{metrics.totalBooked}</span>
          <span className="stat-detail">Of {metrics.totalCapacity} total</span>
        </div>
        <div className="stat-card card-surface">
          <span className="stat-label">Tickets Available</span>
          <span className="stat-value text-emerald">{metrics.totalAvailable}</span>
          <span className="stat-detail">Ready to book</span>
        </div>
        <div className="stat-card card-surface">
          <span className="stat-label">Overall Occupancy</span>
          <span className="stat-value">{metrics.occupancyRate}%</span>
          <span className="stat-detail">{metrics.soldOutCount} slots sold out</span>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="admin-toolbar card-surface">
        <div className="toolbar-group">
          <label htmlFor="admin-site-filter">Filter by Heritage Site</label>
          <select
            id="admin-site-filter"
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="form-control"
          >
            <option value="ALL">All Heritage Sites</option>
            {uniqueSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-group">
          <label htmlFor="admin-date-filter">Filter by Date</label>
          <select
            id="admin-date-filter"
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="form-control"
          >
            <option value="">All Available Dates</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>

        {(selectedSiteFilter !== 'ALL' || selectedDateFilter) && (
          <button
            onClick={() => {
              setSelectedSiteFilter('ALL');
              setSelectedDateFilter('');
            }}
            className="btn btn-secondary btn-clear"
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* Capacity Grid */}
      <section className="admin-slots-section">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading real-time capacity overview...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="empty-state card-surface">
            <p>No slots match the current filter selection.</p>
          </div>
        ) : (
          <div className="admin-grid">
            {filteredSlots.map((slot) => (
              <div key={slot._id} className="admin-slot-card card-surface">
                <div className="admin-card-top">
                  <div>
                    <span className="site-pill">
                      🏛️ {slot.siteId?.name || 'Heritage Site'}
                    </span>
                    <span className="site-sub">{slot.siteId?.location}</span>
                  </div>
                  <span className="date-tag">📅 {slot.date}</span>
                </div>

                <div className="admin-card-window">
                  <span className="window-time">
                    ⏰ {slot.startTime} – {slot.endTime}
                  </span>
                </div>

                <CapacityBar
                  availableTickets={slot.availableTickets}
                  totalCapacity={slot.totalCapacity}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
