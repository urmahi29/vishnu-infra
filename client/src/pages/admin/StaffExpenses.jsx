import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCreditCard, FiFolder, FiChevronRight, FiArrowLeft, FiUser,
  FiTrash2, FiEdit2, FiCalendar, FiSearch, FiDownload, FiPrinter,
  FiMoreVertical, FiPlus, FiX, FiDollarSign, FiUsers,
  FiChevronDown, FiChevronUp,
  FiChevronLeft as FiChevronLeftIcon, FiChevronRight as FiChevronRightIcon
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import useCanEdit from '../../hooks/useCanEdit';
import { projectsAPI, projectStaffExpensesAPI } from '../../services/api';
import {
  getSortedData, filterByDateRange, searchData, paginateData,
  getTotalPages, exportToCSV, printTable, getLastUpdated,
  dateFilterOptions
} from '../../utils/moduleHelpers';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

const ROWS_PER_PAGE = 10;

const StaffExpenses = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Form state
  const [form, setForm] = useState({
    staff_name: '',
    paid_by: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sortField, setSortField] = useState('expense_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const canEdit = useCanEdit();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data?.data || []);
    } catch (err) {
      setProjects([]);
    } finally { setLoadingProjects(false); }
  };

  const fetchExpenses = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingExpenses(true);
      const res = await projectStaffExpensesAPI.getEntries(projectId);
      setExpenses(res.data?.data || []);
    } catch (err) {
      setExpenses([]);
    } finally { setLoadingExpenses(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchExpenses(selectedProject.id);
      setForm({ staff_name: '', paid_by: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
      setEditingExpense(null);
      setCurrentPage(1);
      setSearchQuery('');
      setDateFilter('all');
    } else {
      setExpenses([]);
    }
  }, [selectedProject, fetchExpenses]);

  const searchedData = useMemo(() =>
    searchData(expenses, searchQuery, ['staff_name', 'paid_by', 'expense_date']),
    [expenses, searchQuery]
  );

  const filteredData = useMemo(() =>
    filterByDateRange(searchedData, dateFilter, customStart, customEnd, 'expense_date'),
    [searchedData, dateFilter, customStart, customEnd]
  );

  const sortedData = useMemo(() =>
    getSortedData(filteredData, sortField, sortDirection),
    [filteredData, sortField, sortDirection]
  );

  const totalPages = getTotalPages(sortedData.length, ROWS_PER_PAGE);
  const paginatedData = paginateData(sortedData, currentPage, ROWS_PER_PAGE);

  const totalExpensesAmount = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const uniqueStaffCount = useMemo(() => new Set(expenses.map((e) => e.staff_name)).size, [expenses]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field); setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortableHeader = ({ field, children, align = 'left' }) => (
    <th className={`px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer select-none text-gray-500 hover:text-gray-700 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />
        ) : <FiChevronDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!selectedProject || !form.staff_name || !form.paid_by || !form.amount || !form.expense_date) {
      toast.error('All fields are required.');
      return;
    }
    try {
      setSubmitting(true);
      if (editingExpense) {
        await projectStaffExpensesAPI.update(editingExpense.id, {
          staff_name: form.staff_name, paid_by: form.paid_by, amount: parseFloat(form.amount), expense_date: form.expense_date
        });
        toast.success('Staff expense updated successfully!');
      } else {
        await projectStaffExpensesAPI.create({
          project_id: parseInt(selectedProject.id), staff_name: form.staff_name,
          paid_by: form.paid_by, amount: parseFloat(form.amount), expense_date: form.expense_date
        });
        toast.success('Staff expense saved successfully!');
      }
      setForm({ staff_name: '', paid_by: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
      setEditingExpense(null);
      fetchExpenses(selectedProject.id);
    } catch (err) {
      toast.error(err?.message || 'Failed to save staff expense record');
    } finally { setSubmitting(false); }
  };

  const handleEditClick = (exp) => {
    setEditingExpense(exp);
    setForm({
      staff_name: exp.staff_name, paid_by: exp.paid_by,
      amount: exp.amount.toString(), expense_date: exp.expense_date ? exp.expense_date.split('T')[0] : ''
    });
    setOpenMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setForm({ staff_name: '', paid_by: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
  };

  // ───── Workspace view ─────
  if (selectedProject) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/admin/dashboard" className="hover:text-purple-600 transition-colors">Dashboard</a>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold">Staff Expenses</span>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-purple-600 font-semibold truncate max-w-[200px]">
            {selectedProject.project_name || selectedProject.name}
          </span>
        </nav>

        {/* Back Button */}
        <button onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm">
          <FiArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        {/* Project Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200/40">
              <FiCreditCard className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                Staff Expenses Workspace: {selectedProject.project_name || selectedProject.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  Manager: <span className="font-semibold text-gray-800">{selectedProject.manager_name || 'Unassigned'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  Total Records: <span className="font-semibold text-gray-800">{expenses.length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiFolder className="w-4 h-4 text-gray-400" />
                  Last Updated: <span className="font-semibold text-gray-800">{getLastUpdated(expenses, 'expense_date')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-purple-200/60 shadow-lg shadow-purple-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-400/5 rounded-full blur-2xl group-hover:bg-purple-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-[0.12em]">Total Staff Expense</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                  <FiDollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                ₹{totalExpensesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 font-medium">Total expenses paid to staff</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-purple-200/60 shadow-lg shadow-purple-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-400/5 rounded-full blur-2xl group-hover:bg-purple-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-[0.12em]">Total Payments</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                  <FiCreditCard className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{expenses.length}</p>
              <p className="text-xs text-gray-400 font-medium">Total payment records</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-purple-200/60 shadow-lg shadow-purple-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-400/5 rounded-full blur-2xl group-hover:bg-purple-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-[0.12em]">Total Staff Members</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                  <FiUsers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{uniqueStaffCount}</p>
              <p className="text-xs text-gray-400 font-medium">Unique staff members</p>
            </div>
          </motion.div>
        </div>

        {/* Form + Table Layout */}
        <div className={`grid grid-cols-1 ${canEdit ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {canEdit && (
            <div className="lg:col-span-1">
              {/* Left: Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiCreditCard className="text-purple-500 w-4 h-4" />
                  {editingExpense ? 'Edit Staff Expense' : 'Record Staff Expense'}
                </h3>
              </div>
              <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Staff Name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="staff_name" required placeholder="e.g. Rajesh Kumar"
                    value={form.staff_name} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input type="date" name="expense_date" required value={form.expense_date} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Paid By <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="paid_by" required placeholder="e.g. Suresh Sir"
                    value={form.paid_by} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Amount (₹) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" name="amount" required placeholder="0.00" step="0.01" min="0"
                    value={form.amount} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium font-mono" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                    {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                  </button>
                  {editingExpense && (
                    <button type="button" onClick={handleCancelEdit}
                      className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
          )}

          {/* Right: Search + Filter + Table */}
          <div className={`${canEdit ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-4`}>
            {/* Search & Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by staff name, paid by, or date..."
                    value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all">
                    {dateFilterOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {dateFilter === 'custom' && (
                    <div className="flex gap-2">
                      <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                      <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => exportToCSV(expenses, `StaffExpenses_${selectedProject.project_name}`, [
                  { key: 'staff_name', label: 'Staff Name' },
                  { key: 'expense_date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
                  { key: 'paid_by', label: 'Paid By' },
                  { key: 'amount', label: 'Amount (₹)', format: (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiDownload className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => printTable(`Staff Expenses - ${selectedProject.project_name}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiPrinter className="w-3.5 h-3.5" /> Print
                </button>
                {(searchQuery || dateFilter !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setDateFilter('all'); setCustomStart(''); setCustomEnd(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all">
                    <FiX className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  </div>
                ) : paginatedData.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                      <FiCreditCard className="w-8 h-8 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No records found</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {searchQuery || dateFilter !== 'all'
                        ? 'No records match your current search or filter criteria.'
                        : 'No staff expenses recorded for this project yet.'}
                    </p>
                    {canEdit && !searchQuery && dateFilter === 'all' && (
                      <button onClick={() => document.querySelector('input[name="staff_name"]')?.focus()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
                        <FiPlus className="w-4 h-4" /> Add First Record
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <SortableHeader field="staff_name">Staff Name</SortableHeader>
                        <SortableHeader field="expense_date">Date</SortableHeader>
                        <SortableHeader field="paid_by">Paid By</SortableHeader>
                        <SortableHeader field="amount">Amount (₹)</SortableHeader>
                        {canEdit && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-16">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100" id="printable-table">
                      {paginatedData.map((exp, idx) => (
                        <tr key={exp.id}
                          className={`hover:bg-purple-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                          <td className="px-6 py-4 font-semibold text-gray-900">{exp.staff_name}</td>
                          <td className="px-6 py-4 font-medium text-gray-700">
                            <span className="inline-flex items-center gap-1.5">
                              <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{exp.paid_by}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900 font-mono">
                            ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          {canEdit && (
                          <td className="px-6 py-4 text-right relative">
                            <div className="relative">
                              <button onClick={() => setOpenMenuId(openMenuId === exp.id ? null : exp.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === exp.id && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                                  <button onClick={() => handleEditClick(exp)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                                    <FiEdit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button onClick={() => { setDeleteConfirmId(exp.id); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <FiTrash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {sortedData.length > ROWS_PER_PAGE && (
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of {sortedData.length} records
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <FiChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}>{pageNum}</button>
                      );
                    })}
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <FiChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center z-10 border border-gray-100">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Record?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">This action cannot be undone.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setDeleteConfirmId(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold">Cancel</button>
                  <button onClick={async () => {
                    try {
                      await projectStaffExpensesAPI.delete(deleteConfirmId);
                      setDeleteConfirmId(null);
                      fetchExpenses(selectedProject.id);
                      if (editingExpense?.id === deleteConfirmId) handleCancelEdit();
                      toast.success('Staff expense deleted successfully!');
                    } catch (err) { toast.error('Failed to delete record.'); }
                  }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg shadow-red-200">
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ───── Project list view ─────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Expenses</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a project to manage its staff expenses.</p>
        </div>
      </motion.div>
      <motion.div variants={itemVariants}>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <FiFolder className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400">Please create a project first.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project.id} onClick={() => setSelectedProject(project)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50/50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                      <FiFolder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {project.project_name || project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Manager: <span className="font-medium text-gray-700">{project.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Workspace</span>
                    <FiChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StaffExpenses;
