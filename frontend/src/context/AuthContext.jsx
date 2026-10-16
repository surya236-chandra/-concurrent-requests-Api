// context/AuthContext.jsx - Authentication state management using React Context + useReducer
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!action.payload.token,
        isLoading: false,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Rehydrate user session from localStorage on initial app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: 'INITIALIZE', payload: { user, token } });
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Login handler
  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });

      return { success: true, user };
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Make sure backend is running on port 3000.'
          : 'Login failed. Please check credentials.');
      return { success: false, error: errorMessage };
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await api.post('/auth/register', { name, email, password });
      // Automatically log in after successful registration
      return await login(email, password);
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Registration failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
