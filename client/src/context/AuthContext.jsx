import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { signInWithGoogle, firebaseSignOut } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      console.error('Failed to parse user from localStorage:', err);
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    return !(savedToken && savedUser);
  });
  const [error, setError] = useState(null);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data || response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to load user:', err);
      // Only clear credentials if it is an authentication/token issue (e.g. 401 or 403 status).
      // For network or server errors, we retain the cached user from localStorage.
      const isAuthError = err?.status === 401 || err?.status === 403 || 
                          err?.response?.status === 401 || err?.response?.status === 403;
      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password, rememberMe = false) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password, rememberMe });
      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);

      return userData;
    } catch (err) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (err) {
      const message = err?.message || 'Registration failed.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
    // Also sign out from Firebase
    firebaseSignOut();
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...updatedData }));
  };

  const clearError = () => setError(null);

  const googleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const { idToken } = await signInWithGoogle();
      // Send Firebase ID token to backend for verification
      const response = await authAPI.firebaseLogin({ idToken });
      const { token: newToken, user: userData } = response.data.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);

      return userData;
    } catch (err) {
      const message = err?.message || 'Google sign-in failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    register,
    googleSignIn,
    logout,
    updateUser,
    clearError,
    loadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
