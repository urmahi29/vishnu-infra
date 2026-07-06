import { useState, useEffect, useCallback } from 'react';
import useCanEdit from '../../hooks/useCanEdit';
import { usersAPI } from '../../services/api';
import { 
  FiUser, FiMail, FiPhone, FiSearch, FiPlus, FiEdit2, FiTrash2, 
  FiX, FiRefreshCw, FiChevronLeft, FiChevronRight, FiShield,
  FiAlertCircle, FiCheckCircle, FiClock, FiKey, FiActivity
} from 'react-icons/fi';

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  user: 'bg-blue-100 text-blue-700 border-blue-200'
};

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700'
};

const UserModal = ({ isOpen, onClose, user, onSave }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phone: '', designation: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setForm({ name: user.name || '', email: user.email || '', password: '', role: user.role || 'user', phone: user.phone || '', designation: user.designation || '', department: user.department || '' });
      } else {
        setForm({ name: '', email: '', password: '', role: 'user', phone: '', designation: '', department: '' });
      }
      setError('');
    }
  }, [isOpen, user]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) {
        const data = { name: form.name, email: form.email, role: form.role, phone: form.phone, designation: form.designation, department: form.department };
        await usersAPI.update(user.id, data);
      } else {
        if (!form.password) { setError('Password is required'); setSaving(false); return; }
        await usersAPI.create(form);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{user ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><FiX className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"><FiAlertCircle className="w-4 h-4" />{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{user ? 'New Password (leave blank)' : 'Password *'}</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select name="role" value={form.role} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input type="text" name="designation" value={form.designation} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" name="department" value={form.department} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
              {saving ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Saving...</> : <>{user ? 'Update User' : 'Create User'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Password Reset Modal
// ============================================================
const ResetPasswordModal = ({ isOpen, onClose, user }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true);
    setError('');
    try {
      await usersAPI.update(user.id, { password });
      onClose();
      alert('Password reset successfully!');
    } catch (err) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Reset Password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><FiX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Reset password for <strong>{user?.name}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"><FiAlertCircle className="w-4 h-4 inline mr-1" />{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Audit Logs
// ============================================================
const AuditLogs = ({ logs, loading: logsLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FiActivity className="w-4 h-4" /> Audit Logs</h3>
      </div>
      {logsLoading ? (
        <div className="p-6 text-center text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" /><p>Loading logs...</p></div>
      ) : logs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.map((log, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-gray-900 capitalize">{log.action?.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3 text-gray-600">{log.user_name || 'System'}</td>
                  <td className="px-6 py-3 text-gray-500">{log.entity_type} #{log.entity_id}</td>
                  <td className="px-6 py-3 text-gray-500">{new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400"><FiActivity className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No audit logs yet</p></div>
      )}
    </div>
  );
};

// ============================================================
// Main Users Page
// ============================================================
const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPassUser, setResetPassUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const limit = 15;
  const canEdit = useCanEdit();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit, search, role: roleFilter };
      const res = await usersAPI.getAll(params);
      if (res.data?.success) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  const fetchAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await usersAPI.getAuditLogs({ limit: 20 });
      if (res.data?.success) setAuditLogs(res.data.data);
    } catch (err) {} finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await usersAPI.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {}
  };

  const totalUsers = pagination.total || users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeUsers = users.filter(u => u.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system users, roles, and permissions</p>
        </div>
        {canEdit && (
        <button onClick={() => { setSelectedUser(null); setShowModal(true); }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-200">
          <FiPlus className="w-4 h-4" /> Add User
        </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', count: totalUsers, icon: FiUser, color: 'bg-gradient-to-br from-blue-600 to-indigo-700' },
          { label: 'Active', count: activeUsers, icon: FiCheckCircle, color: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
          { label: 'Admins', count: adminCount, icon: FiShield, color: 'bg-gradient-to-br from-purple-500 to-purple-700' },
          { label: 'Standard Users', count: totalUsers - adminCount, icon: FiUser, color: 'bg-gradient-to-br from-cyan-500 to-cyan-700' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className={`rounded-2xl ${color} p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <div><p className="text-white/80 text-sm font-medium">{label}</p><p className="text-3xl font-bold mt-1">{count}</p></div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Icon className="w-6 h-6" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, or Employee ID..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
            </div>
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all text-sm bg-white min-w-[160px]">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <button onClick={() => fetchUsers()} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 transition-all"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" /><p>Loading users...</p></div>
        ) : error ? (
          <div className="p-8 text-center text-amber-600"><FiAlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><FiUser className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No users found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">{u.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 flex items-center gap-1.5"><FiMail className="w-3.5 h-3.5 text-gray-400" /> {u.email}</p>
                      {u.phone && <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5"><FiPhone className="w-3 h-3" /> {u.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}>{u.role}</span>
                      {u.designation && <p className="text-xs text-gray-400 mt-0.5">{u.designation}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_STYLES[u.status] || STATUS_STYLES.active}`}>{u.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {u.last_login_at ? <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5" />{new Date(u.last_login_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span> : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                        <button onClick={() => setResetPassUser(u)} className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-all" title="Reset Password"><FiKey className="w-4 h-4" /></button>
                        )}
                        {canEdit && (
                        <button onClick={() => { setSelectedUser(u); setShowModal(true); }} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                        )}
                        {canEdit && (
                        <button onClick={() => setDeleteConfirm(u)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Audit Logs */}
      <AuditLogs logs={auditLogs} loading={logsLoading} />

      {/* Modals */}
      <UserModal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedUser(null); }} user={selectedUser} onSave={() => { fetchUsers(); fetchAuditLogs(); }} />
      <ResetPasswordModal isOpen={!!resetPassUser} onClose={() => setResetPassUser(null)} user={resetPassUser} />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="w-7 h-7 text-red-500" /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-500 text-sm mb-6">Remove <strong>{deleteConfirm.name}</strong> from the system? This cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-medium">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg shadow-red-200">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
