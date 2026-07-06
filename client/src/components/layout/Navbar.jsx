import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiBell, FiLogOut, FiUser, FiChevronDown, FiSettings } from 'react-icons/fi';
import logo from '../../assets/logo.jpg';

const Navbar = ({ role, onMenuClick }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left - Menu toggle + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all lg:hidden"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          <Link to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-sm">
              <img src={logo} alt="VI" className="w-full h-full object-cover" />
            </div>
            <span className="hidden sm:block font-semibold text-gray-800 text-sm">
              Vishnu Infra ERP
            </span>
          </Link>
        </div>

        {/* Right - Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
            >
              <FiBell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 glass rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                  </div>
                  <div className="p-6 text-center text-gray-400 text-sm">
                    <FiBell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No new notifications</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role || ''}</p>
              </div>
              <FiChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      to={isAdmin ? '/admin/settings' : '/user/profile'}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <FiUser className="w-4 h-4" />
                      Profile Settings
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <FiSettings className="w-4 h-4" />
                        System Settings
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <FiLogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
