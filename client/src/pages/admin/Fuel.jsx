import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  FiDroplet, FiFolder, FiChevronRight, FiArrowLeft, FiUser,
  FiTrash2, FiEdit2, FiCalendar, FiSearch, FiDownload, FiPrinter,
  FiMoreVertical, FiPlus, FiX, FiChevronDown, FiChevronUp,
  FiChevronLeft as FiChevronLeftIcon, FiChevronRight as FiChevronRightIcon
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import useCanEdit from '../../hooks/useCanEdit';
import { projectsAPI, projectFuelAPI } from '../../services/api';
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

const Fuel = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/user';

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Form state
  const [form, setForm] = useState({
    quantity: '',
    cost: '',
    purchased_by: '',
    fuel_date: new Date().toISOString().split('T')[0]
  });
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sortField, setSortField] = useState('fuel_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const canEdit = useCanEdit();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data?.data || []);
    } catch (err) {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchFuelEntries = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingEntries(true);
      const res = await projectFuelAPI.getEntries(projectId);
      setFuelEntries(res.data?.data || []);
    } catch (err) {
      setFuelEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchFuelEntries(selectedProject.id);
      setForm({ quantity: '', cost: '', purchased_by: '', fuel_date: new Date().toISOString().split('T')[0] });
      setEditingEntry(null);
      setCurrentPage(1);
      setSearchQuery('');
      setDateFilter('all');
      setCustomStart('');
      setCustomEnd('');
    } else {
      setFuelEntries([]);
    }
  }, [selectedProject, fetchFuelEntries]);

  // Search, filter, sort, paginate
  const searchedData = useMemo(() =>
    searchData(fuelEntries, searchQuery, ['purchased_by', 'fuel_date']),
    [fuelEntries, searchQuery]
  );

  const filteredData = useMemo(() =>
    filterByDateRange(searchedData, dateFilter, customStart, customEnd, 'fuel_date'),
    [searchedData, dateFilter, customStart, customEnd]
  );

  const sortedData = useMemo(() =>
    getSortedData(filteredData, sortField, sortDirection),
    [filteredData, sortField, sortDirection]
  );

  const totalPages = getTotalPages(sortedData.length, ROWS_PER_PAGE);
  const paginatedData = paginateData(sortedData, currentPage, ROWS_PER_PAGE);

  // Summary metrics
  const totalFuelCost = useMemo(() => fuelEntries.reduce((s, e) => s + Number(e.cost), 0), [fuelEntries]);
  const totalFuelQuantity = useMemo(() => fuelEntries.reduce((s, e) => s + Number(e.quantity), 0), [fuelEntries]);

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortableHeader = ({ field, children, align = 'left' }) => (
    <th
      className={`px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer select-none
        text-gray-500 hover:text-gray-700 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />
        ) : (
          <FiChevronDown className="w-3 h-3 text-gray-300" />
        )}
      </span>
    </th>
  );

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!selectedProject || !form.quantity || !form.purchased_by || !form.fuel_date) {
      toast.error('Quantity, Purchased By, and Date are required.');
      return;
    }
    const costVal = form.cost === '' ? null : parseFloat(form.cost);
    try {
      setSubmitting(true);
      if (editingEntry) {
        await projectFuelAPI.update(editingEntry.id, {
          quantity: parseFloat(form.quantity), cost: costVal,
          purchased_by: form.purchased_by, fuel_date: form.fuel_date
        });
        toast.success('Fuel entry updated successfully!');
      } else {
        await projectFuelAPI.create({
          project_id: parseInt(selectedProject.id), quantity: parseFloat(form.quantity),
          cost: costVal, purchased_by: form.purchased_by, fuel_date: form.fuel_date
        });
        toast.success('Fuel entry saved successfully!');
      }
      setForm({ quantity: '', cost: '', purchased_by: '', fuel_date: new Date().toISOString().split('T')[0] });
      setEditingEntry(null);
      fetchFuelEntries(selectedProject.id);
    } catch (err) {
      toast.error(err?.message || 'Failed to save fuel entry');
    } finally { setSubmitting(false); }
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setForm({
      quantity: entry.quantity.toString(),
      cost: (entry.cost === null || entry.cost === undefined || Number(entry.cost) === 0) ? '' : entry.cost.toString(),
      purchased_by: entry.purchased_by,
      fuel_date: entry.fuel_date ? entry.fuel_date.split('T')[0] : ''
    });
    setOpenMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setForm({ quantity: '', cost: '', purchased_by: '', fuel_date: new Date().toISOString().split('T')[0] });
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
          <a href={`${basePath}/dashboard`} className="hover:text-amber-600 transition-colors">Dashboard</a>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold">Fuel Management</span>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-amber-600 font-semibold truncate max-w-[200px]">
            {selectedProject.project_name || selectedProject.name}
          </span>
        </nav>

        {/* Back Button */}
        <button
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        {/* Project Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-200/40">
              <FiDroplet className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                Fuel Workspace: {selectedProject.project_name || selectedProject.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  Manager: <span className="font-semibold text-gray-800">{selectedProject.manager_name || 'Unassigned'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  Total Records: <span className="font-semibold text-gray-800">{fuelEntries.length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiFolder className="w-4 h-4 text-gray-400" />
                  Last Updated: <span className="font-semibold text-gray-800">{getLastUpdated(fuelEntries, 'fuel_date')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">Total Fuel Cost</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <FiDroplet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                ₹{totalFuelCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 font-medium">Total fuel expenditure</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">Total Fuel Qty</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <FiCalendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{totalFuelQuantity.toFixed(2)} L</p>
              <p className="text-xs text-gray-400 font-medium">Total liters of fuel</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">Total Entries</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <FiFolder className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{fuelEntries.length}</p>
              <p className="text-xs text-gray-400 font-medium">Total fuel records</p>
            </div>
          </motion.div>
        </div>

        {/* Entry Form */}
        <div className={`grid grid-cols-1 ${canEdit ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {canEdit && (
            <div className="lg:col-span-1">
              {/* Left: Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiDroplet className="text-amber-500 w-4 h-4" />
                  {editingEntry ? 'Edit Fuel Entry' : 'Record Fuel Entry'}
                </h3>
              </div>
              <form onSubmit={handleSaveEntry} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Fuel Quantity (Liters) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" name="quantity" required placeholder="e.g. 50" step="0.01" min="0"
                    value={form.quantity} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" />
                </div>
                 <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Fuel Cost (Optional)
                  </label>
                  <input type="number" name="cost" placeholder="Leave blank if not available" step="0.01" min="0"
                    value={form.cost} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Purchased By <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="purchased_by" required placeholder="Person who purchased"
                    value={form.purchased_by} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input type="date" name="fuel_date" required value={form.fuel_date} onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                    {submitting ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Fuel Entry'}
                  </button>
                  {editingEntry && (
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
                  <input type="text" placeholder="Search by person name or date..."
                    value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all">
                    {dateFilterOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {dateFilter === 'custom' && (
                    <div className="flex gap-2">
                      <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
                      <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all" />
                    </div>
                  )}
                </div>
              </div>
              {/* Export & Print buttons */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => exportToCSV(fuelEntries, `Fuel_${selectedProject.project_name}`, [
                  { key: 'fuel_date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
                  { key: 'quantity', label: 'Fuel Qty (L)', format: (v) => Number(v).toFixed(2) },
                  { key: 'cost', label: 'Cost (₹)', format: (v) => (!v || Number(v) === 0) ? 'Not Entered' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
                  { key: 'purchased_by', label: 'Purchased By' }
                ])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiDownload className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => printTable(`Fuel Records - ${selectedProject.project_name}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiPrinter className="w-3.5 h-3.5" /> Print
                </button>
                {searchQuery || dateFilter !== 'all' ? (
                  <button onClick={() => { setSearchQuery(''); setDateFilter('all'); setCustomStart(''); setCustomEnd(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all">
                    <FiX className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                ) : null}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {loadingEntries ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                  </div>
                ) : paginatedData.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                      <FiDroplet className="w-8 h-8 text-amber-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No records found</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {searchQuery || dateFilter !== 'all'
                        ? 'No records match your current search or filter criteria.'
                        : 'No fuel entries recorded for this project yet.'}
                    </p>
                    {canEdit && !searchQuery && dateFilter === 'all' && (
                      <button onClick={() => document.querySelector('input[name="quantity"]')?.focus()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
                        <FiPlus className="w-4 h-4" /> Add First Record
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <SortableHeader field="fuel_date">Date</SortableHeader>
                        <SortableHeader field="quantity">Fuel Qty (L)</SortableHeader>
                        <SortableHeader field="cost">Cost (₹)</SortableHeader>
                        <SortableHeader field="purchased_by">Purchased By</SortableHeader>
                        {canEdit && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-16">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100" id="printable-table">
                      {paginatedData.map((entry, idx) => (
                        <tr key={entry.id}
                          className={`hover:bg-amber-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                          <td className="px-6 py-4 font-medium text-gray-700">
                            <span className="inline-flex items-center gap-1.5">
                              <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(entry.fuel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{Number(entry.quantity).toFixed(2)} L</td>
                          <td className="px-6 py-4 font-semibold text-gray-900 font-mono">
                            {(!entry.cost || Number(entry.cost) === 0) ? (
                              <span className="text-gray-400 font-sans font-normal">—</span>
                            ) : (
                              `₹${Number(entry.cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{entry.purchased_by}</td>
                          {canEdit && (
                          <td className="px-6 py-4 text-right relative">
                            <div className="relative">
                              <button onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === entry.id && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                                  <button onClick={() => handleEditClick(entry)}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                                    <FiEdit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button onClick={() => { setDeleteConfirmId(entry.id); setOpenMenuId(null); }}
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

              {/* Pagination */}
              {sortedData.length > ROWS_PER_PAGE && (
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                    {Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of {sortedData.length} records
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
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}>
                          {pageNum}
                        </button>
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Fuel Record?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">This action cannot be undone.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setDeleteConfirmId(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold">Cancel</button>
                  <button onClick={async () => {
                    try {
                      await projectFuelAPI.delete(deleteConfirmId);
                      setDeleteConfirmId(null);
                      fetchFuelEntries(selectedProject.id);
                      if (editingEntry?.id === deleteConfirmId) handleCancelEdit();
                      toast.success('Fuel entry deleted successfully!');
                    } catch (err) { toast.error('Failed to delete fuel entry.'); }
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a project to manage its fuel logs and records.</p>
        </div>
      </motion.div>
      <motion.div variants={itemVariants}>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <FiFolder className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400">Please create a project in the Projects page to view it here.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project.id} onClick={() => setSelectedProject(project)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50/50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                      <FiFolder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                        {project.project_name || project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Manager: <span className="font-medium text-gray-700">{project.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Fuel Workspace</span>
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

export default Fuel;
