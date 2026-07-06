import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiFolder, FiTruck, FiUsers, FiDroplet, FiDollarSign, FiNavigation,
  FiFileText, FiCalendar, FiUser, FiActivity
} from 'react-icons/fi';
import { dashboardAPI } from '../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const UserDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await dashboardAPI.getUser();
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    // Auto-refresh every 30s so users see Admin changes automatically
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const recentProjects = data?.recent_projects || [];
  const recentFuel = data?.recent_fuel_entries || [];
  const recentBudget = data?.recent_budget_entries || [];
  const recentTrips = data?.recent_trips || [];
  const recentDocs = data?.recent_documents || [];

  const statCards = [
    { label: 'Total Projects', value: summary.total_projects ?? '--', icon: FiFolder, bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
    { label: 'Vehicles', value: summary.total_vehicles ?? '--', icon: FiTruck, bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-200' },
    { label: 'Workforce', value: summary.total_workers ?? '--', icon: FiUsers, bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-200' },
    { label: 'Fuel Entries', value: summary.total_fuel_entries ?? '--', icon: FiDroplet, bg: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200' },
    { label: 'Budget Entries', value: summary.total_budget_entries ?? '--', icon: FiDollarSign, bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
    { label: 'Trips', value: summary.total_trips ?? '--', icon: FiNavigation, bg: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-200' },
    { label: 'Documents', value: summary.total_documents ?? '--', icon: FiFileText, bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-200' },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Welcome */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
            <FiActivity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Overview Dashboard</h1>
            <p className="text-gray-500 mt-1">Live statistics from the ERP system. All data is read-only.</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label}
              className={`rounded-2xl bg-gradient-to-br ${stat.bg} p-4 text-white shadow-lg ${stat.shadow} relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-white/80" />
                </div>
                <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Recent Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiFolder className="w-4 h-4 text-blue-500" /> Recent Projects
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{summary.total_projects ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentProjects.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No projects yet.</p>
            ) : recentProjects.map((p) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FiFolder className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name || p.project_name}</p>
                    <p className="text-xs text-gray-400">
                      <FiUser className="w-3 h-3 inline mr-0.5" />
                      {p.manager_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                  p.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-50 text-gray-600'
                }`}>{p.status?.replace(/_/g, ' ') || 'active'}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Fuel Entries */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiDroplet className="w-4 h-4 text-amber-500" /> Recent Fuel Entries
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{summary.total_fuel_entries ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentFuel.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No fuel entries yet.</p>
            ) : recentFuel.map((fe) => (
              <div key={fe.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FiDroplet className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{fe.project_name || 'Project'}</p>
                    <p className="text-xs text-gray-400">
                      {fe.quantity ? `${Number(fe.quantity).toFixed(1)}L` : ''} · ₹{(!fe.cost || Number(fe.cost) === 0) ? '—' : Number(fe.cost).toLocaleString('en-IN')} · {fe.purchased_by}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(fe.fuel_date)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Budget Entries */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiDollarSign className="w-4 h-4 text-emerald-500" /> Recent Budget Entries
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{summary.total_budget_entries ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBudget.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No budget entries yet.</p>
            ) : recentBudget.map((be) => (
              <div key={be.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <FiDollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{be.project_name || 'Project'}</p>
                    <p className="text-xs text-gray-400 truncate">{be.description || 'No description'} · {be.paid_by}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-900 flex-shrink-0">₹{Number(be.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Trips */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiNavigation className="w-4 h-4 text-blue-500" /> Recent Trips
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{summary.total_trips ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTrips.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No trips yet.</p>
            ) : recentTrips.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FiNavigation className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.project_name || 'Project'}</p>
                    <p className="text-xs text-gray-400">
                      {t.trip_number} · {t.vehicle_number}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  t.trip_type === 'Day' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                }`}>{t.trip_type || '—'}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Documents */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-indigo-500" /> Recent Documents
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{summary.total_documents ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No documents uploaded yet.</p>
            ) : recentDocs.map((d) => (
              <div key={d.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FiFileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400">
                      {d.project_name || 'General'} · {d.document_type?.replace(/_/g, ' ') || 'Document'} · {formatDate(d.created_at)}
                    </p>
                  </div>
                </div>
                {d.file_path && (
                  <a href={d.file_path} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all flex-shrink-0">
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserDashboard;
