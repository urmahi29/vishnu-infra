import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiFolder, FiTruck, FiUsers, FiBell,
  FiArrowRight, FiRefreshCw, FiCalendar
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI, reportsAPI, notificationsAPI } from '../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!value && value !== 0) { setDisplayValue(0); return; }
    const numValue = Number(value);
    if (isNaN(numValue)) { setDisplayValue(0); return; }

    const duration = 1500;
    const steps = 30;
    const increment = numValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) {
        setDisplayValue(numValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [dashboardRes, kpiRes, notifRes] = await Promise.allSettled([
        dashboardAPI.getAdmin(),
        reportsAPI.getDashboardKPIs(),
        notificationsAPI.getAll({ limit: 6, is_read: false })
      ]);

      if (dashboardRes.status === 'fulfilled') setDashboardData(dashboardRes.value.data.data);
      if (kpiRes.status === 'fulfilled') setKpiData(kpiRes.value.data.data);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.data || []);

      setError(null);
    } catch (err) {
      setError('Could not load dashboard data. Connect to database to see real data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const summary = dashboardData?.summary || {};
  const projects = kpiData?.projects || {};
  const equipment = kpiData?.equipment || {};
  const workforce = kpiData?.workforce || {};
  const recentProjects = dashboardData?.recent_projects || [];
  const pendingTasks = dashboardData?.pending_tasks || [];
  const recentExpenses = dashboardData?.recent_expenses || [];

  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/user';

  const statsCards = [
    {
      label: 'Total Running Projects',
      value: summary.active_projects,
      total: summary.total_projects,
      icon: FiFolder,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-600',
      gradient: 'from-blue-500 to-blue-600',
      link: `${basePath}/projects`
    },
    {
      label: 'Total Employees',
      value: workforce?.total_workers,
      detail: `${workforce?.active_workers || 0} active`,
      icon: FiUsers,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      gradient: 'from-emerald-500 to-green-600',
      link: `${basePath}/workforce`
    },
    {
      label: 'Notifications',
      value: notifications.length,
      icon: FiBell,
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500',
      textColor: 'text-purple-600',
      gradient: 'from-purple-500 to-violet-600',
      link: `${basePath}/notifications`,
      isNotif: true
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="mt-4 text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Here's your construction overview for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <FiRefreshCw className="w-4 h-4" />
            </motion.div>
            Refresh
          </button>
          <span className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Live Dashboard
          </span>
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
        >
          <FiAlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Data Connection Status</p>
            <p className="text-xs text-amber-600 mt-0.5">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Animated Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link to={stat.link} key={stat.label}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 80 }}
                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                className="relative bg-white rounded-xl p-5 border border-gray-200 cursor-pointer group overflow-hidden"
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />

                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                  {/* Icon indicator */}
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                  >
                    <FiArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </motion.div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-gray-900">
                    {stat.isNotif ? (
                      stat.value
                    ) : (
                      <AnimatedNumber value={stat.value} />
                    )}
                  </span>
                  {stat.total !== undefined && (
                    <span className="text-sm text-gray-400">
                      / <AnimatedNumber value={stat.total} />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  {stat.detail && <span className="text-xs text-gray-400">{stat.detail}</span>}
                </div>

                {/* Progress bar for projects */}
                {stat.total && stat.total > 0 && (
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((stat.value || 0) / stat.total) * 100}%` }}
                      transition={{ duration: 1.5, delay: idx * 0.2, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${stat.gradient}`}
                    />
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </motion.div>

      {/* Operation Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
        {/* Calendar and Overview Card */}
        <div className="flex flex-col justify-between bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          {/* Subtle background overlay grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="w-5 h-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mt-6">
              {summary.total_projects || 0} Total Projects
            </h3>
            <p className="text-sm text-yellow-100/90 mt-2 leading-relaxed">
              Managing all assets, operations, and workforce efficiently.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/80 font-medium">
            <span>{summary.completed_projects || 0} Completed</span>
            <span>•</span>
            <span>{summary.active_projects || 0} Running</span>
            {summary.on_hold_projects > 0 && (
              <>
                <span>•</span>
                <span>{summary.on_hold_projects} On Hold</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
