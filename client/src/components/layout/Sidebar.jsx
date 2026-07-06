import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import {
  FiGrid, FiFolder, FiCheckSquare, FiTruck, FiPackage,
  FiDollarSign, FiUsers, FiBarChart2, FiFileText, FiShield,
  FiBell, FiSettings, FiUser, FiLogOut, FiChevronLeft, FiHardDrive,
  FiUserCheck, FiDroplet, FiCreditCard, FiNavigation
} from 'react-icons/fi';

import logo from '../../assets/logo.jpg';

const adminMenuItems = [
  { path: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
  { path: '/admin/projects', icon: FiFolder, label: 'Projects' },
  { path: '/admin/budget', icon: FiDollarSign, label: 'Budget' },
  { path: '/admin/workforce', icon: FiUsers, label: 'Workforce' },
  { path: '/admin/fuel', icon: FiDroplet, label: 'Fuel' },
  { path: '/admin/staff-expenses', icon: FiCreditCard, label: 'Staff Expenses' },
  { path: '/admin/trips', icon: FiNavigation, label: 'Trip' },
  { path: '/admin/documents', icon: FiFileText, label: 'Documents' },
  { path: '/admin/registration-requests', icon: FiUserCheck, label: 'Pending Requests' },
  { path: '/admin/users', icon: FiHardDrive, label: 'Users' },
  { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
];

const userMenuItems = [
  { path: '/user/dashboard', icon: FiGrid, label: 'Dashboard' },
  { path: '/user/projects', icon: FiFolder, label: 'Projects' },
  { path: '/user/budget', icon: FiDollarSign, label: 'Budget' },
  { path: '/user/workforce', icon: FiUsers, label: 'Workforce' },
  { path: '/user/fuel', icon: FiDroplet, label: 'Fuel' },
  { path: '/user/staff-expenses', icon: FiCreditCard, label: 'Staff Expenses' },
  { path: '/user/trips', icon: FiNavigation, label: 'Trips' },
  { path: '/user/documents', icon: FiFileText, label: 'Documents' },
  { path: '/user/profile', icon: FiUser, label: 'Profile' },
];

const Sidebar = ({ role, isOpen, onToggle }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;
  const [pendingCount, setPendingCount] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const fetchPendingCount = async () => {
        try {
          const response = await usersAPI.getPendingCount();
          setPendingCount(response.data.count);
        } catch (err) {
          console.error('Failed to fetch pending count:', err);
        }
      };
      
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <motion.aside
        initial={{ width: isMobile ? 260 : (isOpen ? 260 : 80) }}
        animate={{ width: isMobile ? 260 : (isOpen ? 260 : 80) }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 shadow-sm
          max-lg:fixed max-lg:top-0 max-lg:bottom-0 max-lg:left-0 max-lg:transition-transform max-lg:duration-300 max-lg:ease-in-out
          ${isOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-gray-100 px-5 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen ? (
            <>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100 shadow-sm">
                  <img src={logo} alt="VI" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col justify-center flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800 leading-tight whitespace-nowrap">Vishnu Infra</p>
                  <p className="text-[10px] text-gray-400 leading-tight whitespace-nowrap">Enterprise ERP</p>
                </div>
              </div>
              <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all hidden lg:block flex-shrink-0 ml-1">
                <FiChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100 shadow-sm">
              <img src={logo} alt="VI" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const showBadge = item.path === '/admin/registration-requests' && pendingCount > 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                title={!isOpen ? item.label : ''}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {!isOpen && showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-white" />
                  )}
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm flex-1 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isOpen && showBadge && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    {pendingCount}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom - User info */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
};

export default Sidebar;
