import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiArrowRight, FiHardDrive, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.jpg';
import loginBg from '../../assets/login_bg.jpg';

const Login = () => {
  const navigate = useNavigate();
  const { login, googleSignIn, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  // Clear error when user types
  useEffect(() => {
    if (error) setError('');
  }, [formData.email, formData.password]);

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError('');

    try {
      const userData = await login(formData.email, formData.password, formData.rememberMe);
      // Redirect based on role
      const redirectPath = userData.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Floating particles for background
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 8 + 4,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 8,
  }));

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-blue-400 transition-all bg-gray-900/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 hover:border-blue-500/30 shadow-lg shadow-black/20 group"
        >
          <FiArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-[2px]" />

      {/* Animated background particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-500/10"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Decorative gradient orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Login Card */}
        <div className="glass rounded-2xl shadow-2xl p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link to="/">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-lg shadow-blue-500/10 flex items-center justify-center overflow-hidden border border-gray-100 hover:scale-105 transition-transform cursor-pointer"
              >
                <img src={logo} alt="Vishnu Infra Logo" className="w-full h-full object-cover" />
              </motion.div>
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-900"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 mt-1 text-sm"
            >
              Sign in to your account to continue
            </motion.p>
            {/* Company Logo Title */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50/50 text-blue-700 rounded-full text-xs font-semibold tracking-wide border border-blue-100"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              VISHNU INFRA
            </motion.div>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Login Failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                  <FiX className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 transition-all
                    ${errors.email
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                    }`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
                >
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full pl-11 pr-11 py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 transition-all
                    ${errors.password
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                    }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
                >
                  <FiAlertCircle className="w-3 h-3" />
                  {errors.password}
                </motion.p>
              )}
            </div>



            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 gradient-primary text-white font-semibold rounded-xl
                hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300
                disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-none
                flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              setError('');
              try {
                const userData = await googleSignIn();
                const redirectPath = userData.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
                navigate(redirectPath, { replace: true });
              } catch (err) {
                setError(err.message || 'Google sign-in failed.');
              } finally {
                setGoogleLoading(false);
              }
            }}
            className="w-full py-3 px-4 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl
              hover:bg-gray-50 hover:border-gray-300 transition-all duration-300
              disabled:opacity-70 disabled:cursor-not-allowed
              flex items-center justify-center gap-3 group"
          >
            {googleLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Create Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-gray-500/60">
          &copy; {new Date().getFullYear()} Road Construction & Infrastructure Management System. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
