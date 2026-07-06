import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../services/api';
import { 
  FiUserCheck, FiSearch, FiX, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiUser, FiCalendar, FiAlertCircle, FiCheckCircle, FiEye, FiClock, FiXCircle, FiPhone, FiMail
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200'
};

const RegistrationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // pending, active (approved), rejected
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [approveConfirm, setApproveConfirm] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const limit = 10;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit, status: statusFilter === 'approved' ? 'active' : statusFilter };
      const res = await usersAPI.getPendingRegistrations(params);
      if (res.data?.success) {
        setRequests(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await usersAPI.getPendingCount();
      if (res.data?.success) {
        setPendingCount(res.data.count);
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchPendingCount();
  }, [fetchRequests, fetchPendingCount]);

  const handleApprove = async () => {
    if (!approveConfirm) return;
    setActionLoading(true);
    setActionError('');
    try {
      await usersAPI.approveRegistration(approveConfirm.id);
      setApproveConfirm(null);
      fetchRequests();
      fetchPendingCount();
    } catch (err) {
      setActionError(err?.message || 'Failed to approve user registration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectConfirm) return;
    setActionLoading(true);
    setActionError('');
    try {
      await usersAPI.rejectRegistration(rejectConfirm.id, { rejectionReason });
      setRejectConfirm(null);
      setRejectionReason('');
      fetchRequests();
      fetchPendingCount();
    } catch (err) {
      setActionError(err?.message || 'Failed to reject user registration');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registration Requests</h1>
            <p className="text-gray-500 mt-1">Review and manage user account registration requests</p>
          </div>
          <button 
            onClick={() => { fetchRequests(); fetchPendingCount(); }} 
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            title="Refresh List"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Requests', count: pendingCount, icon: FiClock, color: 'bg-gradient-to-br from-amber-500 to-amber-600' },
          { label: 'Review Status Filter', count: statusFilter.toUpperCase(), icon: FiUserCheck, color: 'bg-gradient-to-br from-blue-600 to-indigo-700' },
          { label: 'Total in Current View', count: pagination.total, icon: FiUser, color: 'bg-gradient-to-br from-gray-600 to-gray-700' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className={`rounded-2xl ${color} p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2 mb-6 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex border border-gray-100 rounded-xl overflow-hidden p-1 bg-gray-50">
          {[
            { value: 'pending', label: '🟡 Pending' },
            { value: 'approved', label: '🟢 Approved' },
            { value: 'rejected', label: '🔴 Rejected' }
          ].map(tab => (
            <button 
              key={tab.value} 
              onClick={() => { setStatusFilter(tab.value); setPage(1); }} 
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === tab.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <svg className="animate-spin w-8 h-8 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">Loading requests...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-8 text-center shadow-sm">
          <FiAlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-lg">{error}</p>
          <button onClick={() => fetchRequests()} className="mt-4 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all">Retry</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <FiUserCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-950 mb-1">No Requests Found</h3>
          <p className="text-gray-500">There are no registration requests currently marked as {statusFilter}.</p>
        </div>
      ) : (
        <>
          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Role Requested</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {requests.map(request => (
                    <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{request.name}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{request.email}</td>
                      <td className="px-6 py-4 text-gray-500">{request.phone || '—'}</td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold capitalize">{request.role}</span></td>
                      <td className="px-6 py-4 text-gray-500">{new Date(request.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[request.status] || STATUS_STYLES.pending}`}>
                          {request.status === 'active' ? 'Approved' : request.status?.replace(/^\w/, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => setViewingRequest(request)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => setApproveConfirm(request)}
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 transition-all"
                              title="Approve User"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setRejectConfirm(request)}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-all"
                              title="Reject User"
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-50 p-4 bg-gray-50/50">
                <p className="text-sm text-gray-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} requests</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 1. Request Details Modal */}
      <AnimatePresence>
        {viewingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingRequest(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FiUser className="text-blue-500" /> Registration Details</h3>
                <button onClick={() => setViewingRequest(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"><FiX className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Full Name</p>
                    <p className="font-semibold text-gray-900 mt-1">{viewingRequest.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Requested Role</p>
                    <p className="font-semibold text-gray-900 capitalize mt-1">{viewingRequest.role}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Email Address</p>
                    <p className="font-semibold text-gray-900 mt-1 flex items-center gap-1.5"><FiMail className="text-gray-400" />{viewingRequest.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Phone Number</p>
                    <p className="font-semibold text-gray-900 mt-1 flex items-center gap-1.5"><FiPhone className="text-gray-400" />{viewingRequest.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Registration Date</p>
                    <p className="font-semibold text-gray-900 mt-1 flex items-center gap-1.5"><FiCalendar className="text-gray-400" />{new Date(viewingRequest.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Current Status</p>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1.5 ${STATUS_STYLES[viewingRequest.status] || STATUS_STYLES.pending}`}>
                      {viewingRequest.status === 'active' ? 'Approved' : viewingRequest.status?.replace(/^\w/, c => c.toUpperCase())}
                    </span>
                  </div>
                  {viewingRequest.status === 'rejected' && viewingRequest.rejection_reason && (
                    <div className="col-span-2 bg-red-50/50 border border-red-100 rounded-xl p-3 mt-2">
                      <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">Rejection Reason</p>
                      <p className="text-red-700 font-medium mt-1 leading-relaxed">{viewingRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button onClick={() => setViewingRequest(null)} className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold shadow-sm">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Approve Confirmation Modal */}
      <AnimatePresence>
        {approveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setApproveConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center z-10 border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Approve User Registration?</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Are you sure you want to approve registration for <strong>{approveConfirm.name}</strong>? They will be activated and allowed to log in as a <strong>{approveConfirm.role}</strong>.
              </p>
              {actionError && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs mb-4">{actionError}</div>}
              <div className="flex gap-3 justify-center">
                <button onClick={() => setApproveConfirm(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold">Cancel</button>
                <button onClick={handleApprove} disabled={actionLoading} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-emerald-200 disabled:opacity-50">
                  {actionLoading ? 'Approving...' : 'Confirm Approve'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Reject Confirmation Modal with Reason */}
      <AnimatePresence>
        {rejectConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRejectConfirm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <FiXCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Reject User Registration?</h3>
              <p className="text-gray-500 text-sm text-center mb-4 leading-relaxed">
                Are you sure you want to reject the registration request for <strong>{rejectConfirm.name}</strong>? They will not be able to log in.
              </p>
              
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Provide Rejection Reason (Optional)</label>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Email address domain is invalid or name mismatch..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none text-sm"
                />
              </div>

              {actionError && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs mb-4">{actionError}</div>}
              
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setRejectConfirm(null); setRejectionReason(''); }} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold">Cancel</button>
                <button onClick={handleReject} disabled={actionLoading} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg shadow-red-200 disabled:opacity-50">
                  {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegistrationRequests;
