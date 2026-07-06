import { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../../services/api';
import { 
  FiBell, FiTrash2, FiRefreshCw, FiCheckCircle, FiAlertCircle,
  FiInfo, FiAlertTriangle, FiChevronLeft, FiChevronRight, FiClock, FiMail
} from 'react-icons/fi';

const TYPE_STYLES = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700'
};

const TYPE_ICONS = {
  info: FiInfo,
  warning: FiAlertTriangle,
  success: FiCheckCircle,
  error: FiAlertCircle
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 20;

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsAPI.getAll({ page, limit });
      if (res.data?.success) {
        setNotifications(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await notificationsAPI.delete(id);
      fetchNotifs();
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalNotifs = pagination.total || notifications.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">Stay updated with system activities and alerts</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-medium flex items-center gap-2 text-sm">
                <FiCheckCircle className="w-4 h-4" /> Mark All Read
              </button>
            )}
            <button onClick={() => fetchNotifs()} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 transition-all">
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-white/80 text-sm font-medium">Total</p><p className="text-3xl font-bold mt-1">{totalNotifs}</p></div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><FiBell className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-white/80 text-sm font-medium">Unread</p><p className="text-3xl font-bold mt-1">{unreadCount}</p></div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><FiBell className="w-6 h-6" /></div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-white/80 text-sm font-medium">Read</p><p className="text-3xl font-bold mt-1">{totalNotifs - unreadCount}</p></div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><FiCheckCircle className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <FiAlertCircle className="w-10 h-10 mx-auto mb-2 text-amber-500" />
            <p className="text-amber-600">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FiBell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-gray-900 mb-1">No Notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(n => {
              const TypeIcon = TYPE_ICONS[n.type] || FiInfo;
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl ${TYPE_STYLES[n.type] || 'bg-blue-100 text-blue-700'} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                      {!n.is_read && (
                        <button onClick={() => handleMarkRead(n.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex-shrink-0 ml-3">Mark Read</button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><FiClock className="w-3 h-3" />{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLES[n.type] || 'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                      {n.category && <span className="text-xs text-gray-400 capitalize">{n.category}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(n.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all flex-shrink-0 opacity-0 hover:opacity-100" title="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
