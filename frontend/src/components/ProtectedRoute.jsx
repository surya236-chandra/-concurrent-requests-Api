// components/ProtectedRoute.jsx - Route protection and role-based access guard
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Not logged in -> Redirect to login page and remember where they wanted to go
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin route check
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/book" replace />;
  }

  return children;
}
