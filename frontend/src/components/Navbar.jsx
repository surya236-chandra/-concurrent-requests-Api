// components/Navbar.jsx - Top navigation header
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">Heritage Reserve</span>
        </Link>

        {isAuthenticated && (
          <nav className="navbar-links">
            <Link
              to="/book"
              className={`nav-link ${location.pathname === '/book' ? 'active' : ''}`}
            >
              Book Tickets
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin Dashboard
              </Link>
            )}
          </nav>
        )}

        <div className="navbar-auth">
          {isAuthenticated ? (
            <div className="user-profile">
              <div className="user-badge">
                <span className="user-name">{user?.name}</span>
                <span className={`user-role-tag ${user?.role}`}>{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn-secondary">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
