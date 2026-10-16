// pages/Login.jsx - User login page
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/book';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    const result = await login(email, password);
    if (result.success) {
      setStatus('success');
      navigate(from, { replace: true });
    } else {
      setStatus('error');
      setError(result.error);
    }
  };

  const fillDemoUser = () => {
    setEmail('user@heritage.com');
    setPassword('User@123');
    setError('');
  };

  const fillDemoAdmin = () => {
    setEmail('admin@heritage.com');
    setPassword('Admin@123');
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🏛️</div>
          <h2>Welcome Back</h2>
          <p>Sign in to manage and book heritage site reservations</p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="e.g. user@heritage.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <span className="btn-loading">
                <span className="spinner-small"></span> Authenticating...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="demo-credentials-box">
          <p className="demo-title">Quick Demo Login:</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn-demo"
              onClick={fillDemoUser}
            >
              Demo User (User@123)
            </button>
            <button
              type="button"
              className="btn-demo admin"
              onClick={fillDemoAdmin}
            >
              Demo Admin (Admin@123)
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
