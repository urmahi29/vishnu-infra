import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.jpg';
import loginBg from '../../assets/login_bg.jpg';

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (error) setError('');
  }, [formData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'At least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError('');

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-[2px]" />

      <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl shadow-2xl p-8 sm:p-10">
          {isSuccess ? (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <FiCheckCircle className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-950 mb-2">Request Submitted</h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Your registration request has been successfully submitted and is awaiting administrator approval. You will be able to log in once your account is approved by an administrator.
              </p>
              <Link
                to="/login"
                className="w-full py-3 px-4 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-lg shadow-blue-500/10 flex items-center justify-center overflow-hidden border border-gray-100"
                >
                  <img src={logo} alt="Vishnu Infra Logo" className="w-full h-full object-cover" />
                </motion.div>
                <h1 className="text-2xl font-bold text-gray-950">Create Account</h1>
                <p className="text-gray-500 mt-1 text-sm">Register to get started</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text" name="name" value={formData.name} onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="you@example.com"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                        placeholder="Min 6 chars"
                        className={`w-full pl-11 pr-11 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.password ? 'border-red-300 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm</label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                        placeholder="Confirm"
                        className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.confirmPassword ? 'border-red-300 focus:ring-red-500/20' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="w-full py-3 px-4 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign In</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-gray-500/60">
          &copy; {new Date().getFullYear()} Road Construction ERP
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
