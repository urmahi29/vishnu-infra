import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  FiNavigation, FiFolder, FiChevronRight, FiArrowLeft, FiUser,
  FiTrash2, FiEdit2, FiCalendar, FiSearch, FiDownload, FiPrinter,
  FiMoreVertical, FiPlus, FiX, FiSun, FiMoon,
  FiChevronDown, FiChevronUp, FiTruck,
  FiChevronLeft as FiChevronLeftIcon, FiChevronRight as FiChevronRightIcon
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import useCanEdit from '../../hooks/useCanEdit';
import { projectsAPI, projectTripsAPI } from '../../services/api';
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

const tripFilterOptions = [
  { value: 'all', label: 'All Trip Sheets' },
  { value: 'Day', label: 'Day Sheets' },
  { value: 'Night', label: 'Night Sheets' },
];

const Trips = () => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/user';
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Form state
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    trip_type: 'Day',
    vehicles: [{ vehicle_number: '', trip_number: '' }]
  });
  const [editingSheet, setEditingSheet] = useState(null);
  const [deleteConfirmSheet, setDeleteConfirmSheet] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter, Pagination
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSheetKeys, setExpandedSheetKeys] = useState({});

  const canEdit = useCanEdit();

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data?.data || []);
    } catch (err) {
      setProjects([]);
    } finally { setLoadingProjects(false); }
  };

  const fetchTrips = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingTrips(true);
      const res = await projectTripsAPI.getEntries(projectId);
      setTrips(res.data?.data || []);
    } catch (err) {
      setTrips([]);
    } finally { setLoadingTrips(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTrips(selectedProject.id);
      setForm({
        trip_date: new Date().toISOString().split('T')[0],
        trip_type: 'Day',
        vehicles: [{ vehicle_number: '', trip_number: '' }]
      });
      setEditingSheet(null);
      setCurrentPage(1);
      setSearchVehicle('');
      setSearchDate('');
      setTripTypeFilter('all');
      setDateFilter('all');
      setCustomStart('');
      setCustomEnd('');
      setExpandedSheetKeys({});
    } else {
      setTrips([]);
    }
  }, [selectedProject, fetchTrips]);

  // Aggregate raw flat trips data into structured Trip Sheets
  const tripSheets = useMemo(() => {
    const sheetsMap = {};
    trips.forEach((t) => {
      const dateKey = t.trip_date ? t.trip_date.split('T')[0] : '';
      const key = `${dateKey}_${t.trip_type}`;
      if (!sheetsMap[key]) {
        sheetsMap[key] = {
          project_id: t.project_id,
          trip_date: dateKey,
          trip_type: t.trip_type,
          vehicles: []
        };
      }
      sheetsMap[key].vehicles.push({
        id: t.id,
        vehicle_number: t.vehicle_number,
        trip_number: parseInt(t.trip_number) || 0
      });
    });
    return Object.values(sheetsMap);
  }, [trips]);

  // Compute stats on aggregated trip sheets
  const stats = useMemo(() => {
    let totalSheets = tripSheets.length;
    let uniqueVehicles = new Set();
    let totalTripsCount = 0;
    let dayTripsCount = 0;
    let nightTripsCount = 0;

    tripSheets.forEach((s) => {
      s.vehicles.forEach((v) => {
        if (v.vehicle_number) {
          uniqueVehicles.add(v.vehicle_number.toUpperCase().replace(/\s+/g, ''));
        }
        const count = v.trip_number || 0;
        totalTripsCount += count;
        if (s.trip_type === 'Day') {
          dayTripsCount += count;
        } else if (s.trip_type === 'Night') {
          nightTripsCount += count;
        }
      });
    });

    return {
      totalSheets,
      totalVehicles: uniqueVehicles.size,
      totalTrips: totalTripsCount,
      dayTrips: dayTripsCount,
      nightTrips: nightTripsCount
    };
  }, [tripSheets]);

  // Search & Filter execution
  const filteredSheets = useMemo(() => {
    let result = tripSheets;

    if (searchVehicle.trim()) {
      const query = searchVehicle.toLowerCase().trim();
      result = result.filter((sheet) =>
        sheet.vehicles.some((v) => v.vehicle_number.toLowerCase().includes(query))
      );
    }

    if (searchDate) {
      result = result.filter((sheet) => sheet.trip_date === searchDate);
    }

    if (tripTypeFilter !== 'all') {
      result = result.filter((sheet) => sheet.trip_type === tripTypeFilter);
    }

    result = filterByDateRange(result, dateFilter, customStart, customEnd, 'trip_date');

    // Sort by Date Descending by default
    return result.sort((a, b) => new Date(b.trip_date) - new Date(a.trip_date));
  }, [tripSheets, searchVehicle, searchDate, tripTypeFilter, dateFilter, customStart, customEnd]);

  // Paginated Trip Sheets
  const totalPages = getTotalPages(filteredSheets.length, ROWS_PER_PAGE);
  const paginatedSheets = paginateData(filteredSheets, currentPage, ROWS_PER_PAGE);

  // Dynamic row repeater handlers
  const handleAddVehicleRow = () => {
    setForm(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, { vehicle_number: '', trip_number: '' }]
    }));
  };

  const handleRemoveVehicleRow = (index) => {
    setForm(prev => {
      const nextVehicles = prev.vehicles.filter((_, idx) => idx !== index);
      return {
        ...prev,
        vehicles: nextVehicles.length > 0 ? nextVehicles : [{ vehicle_number: '', trip_number: '' }]
      };
    });
  };

  const handleVehicleChange = (index, field, value) => {
    setForm(prev => {
      const nextVehicles = prev.vehicles.map((v, idx) => {
        if (idx === index) {
          return { ...v, [field]: value };
        }
        return v;
      });
      return { ...prev, vehicles: nextVehicles };
    });
  };

  // Submit / Save handler
  const handleSaveTripSheet = async (e) => {
    e.preventDefault();
    if (!selectedProject || !form.trip_date || !form.trip_type) {
      toast.error('Date and Trip Type are required.');
      return;
    }

    const validVehicles = form.vehicles.filter(
      (v) => v.vehicle_number.trim() !== '' && v.trip_number.toString().trim() !== ''
    );

    if (validVehicles.length === 0) {
      toast.error('At least one vehicle entry with a vehicle number and trip count is required.');
      return;
    }

    const vehiclesData = validVehicles.map((v) => ({
      vehicle_number: v.vehicle_number.toUpperCase().trim(),
      trip_number: parseInt(v.trip_number) || 0
    }));

    try {
      setSubmitting(true);

      // If renaming / editing sheet and date/type changed, delete the old entries first
      if (editingSheet && (editingSheet.trip_date !== form.trip_date || editingSheet.trip_type !== form.trip_type)) {
        await projectTripsAPI.deleteSheet(selectedProject.id, editingSheet.trip_date, editingSheet.trip_type);
      }

      await projectTripsAPI.saveSheet({
        project_id: selectedProject.id,
        trip_date: form.trip_date,
        trip_type: form.trip_type,
        vehicles: vehiclesData
      });

      toast.success(editingSheet ? 'Trip sheet updated successfully!' : 'Trip sheet saved successfully!');
      
      // Reset form & state
      setForm({
        trip_date: new Date().toISOString().split('T')[0],
        trip_type: 'Day',
        vehicles: [{ vehicle_number: '', trip_number: '' }]
      });
      setEditingSheet(null);
      fetchTrips(selectedProject.id);
    } catch (err) {
      toast.error(err?.message || 'Failed to save trip sheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit / Edit Mode Triggers
  const handleEditClick = (sheet) => {
    setEditingSheet(sheet);
    setForm({
      trip_date: sheet.trip_date,
      trip_type: sheet.trip_type,
      vehicles: sheet.vehicles.map((v) => ({
        vehicle_number: v.vehicle_number,
        trip_number: v.trip_number.toString()
      }))
    });
    // Scroll to form (top/left of workspace view layout)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSheet(null);
    setForm({
      trip_date: new Date().toISOString().split('T')[0],
      trip_type: 'Day',
      vehicles: [{ vehicle_number: '', trip_number: '' }]
    });
  };

  // Expand / Collapse details logic
  const toggleExpandSheet = (key) => {
    setExpandedSheetKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Project filtering for Selection List View
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const query = projectSearchQuery.toLowerCase().trim();
    return projects.filter((p) =>
      (p.project_name || p.name || '').toLowerCase().includes(query)
    );
  }, [projects, projectSearchQuery]);

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
          <a href={`${basePath}/dashboard`} className="hover:text-blue-600 transition-colors">Dashboard</a>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold">Trip Management</span>
          <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-blue-600 font-semibold truncate max-w-[200px]">
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
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200/40">
              <FiNavigation className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                Trip Workspace: {selectedProject.project_name || selectedProject.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FiUser className="w-4 h-4 text-gray-400" />
                  Manager: <span className="font-semibold text-gray-800">{selectedProject.manager_name || 'Unassigned'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  Total Sheets: <span className="font-semibold text-gray-800">{tripSheets.length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FiFolder className="w-4 h-4 text-gray-400" />
                  Last Log: <span className="font-semibold text-gray-800">{getLastUpdated(trips, 'trip_date')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-blue-200/60 shadow-lg shadow-blue-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-[0.12em]">Trip Sheets</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <FiFolder className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalSheets}</p>
              <p className="text-xs text-gray-400 font-medium">Total sheets logged</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-blue-200/60 shadow-lg shadow-blue-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-[0.12em]">Total Vehicles</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <FiTruck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalVehicles}</p>
              <p className="text-xs text-gray-400 font-medium">Unique vehicle count</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-blue-200/60 shadow-lg shadow-blue-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-[0.12em]">Total Trips</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <FiNavigation className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.totalTrips}</p>
              <p className="text-xs text-gray-400 font-medium">Accumulated trips</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">Day Trips</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                  <FiSun className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.dayTrips}</p>
              <p className="text-xs text-gray-400 font-medium">Day shift count</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="relative bg-white rounded-2xl border border-indigo-200/60 shadow-lg shadow-indigo-900/5 p-5 overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-400" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-[0.12em]">Night Trips</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <FiMoon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{stats.nightTrips}</p>
              <p className="text-xs text-gray-400 font-medium">Night shift count</p>
            </div>
          </motion.div>
        </div>

        {/* Form + List Layout */}
        <div className={`grid grid-cols-1 ${canEdit ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {canEdit && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    {editingSheet ? <FiEdit2 className="text-blue-500 w-4 h-4" /> : <FiNavigation className="text-blue-500 w-4 h-4" />}
                    {editingSheet ? 'Edit Trip Sheet' : 'Record Trip Sheet'}
                  </h3>
                </div>
                <form onSubmit={handleSaveTripSheet} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Trip Type <span className="text-red-400">*</span>
                      </label>
                      <select value={form.trip_type} onChange={(e) => setForm(prev => ({ ...prev, trip_type: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                        <option value="Day">☀️ Day Trip</option>
                        <option value="Night">🌙 Night Trip</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Date of Trip <span className="text-red-400">*</span>
                      </label>
                      <input type="date" required value={form.trip_date} onChange={(e) => setForm(prev => ({ ...prev, trip_date: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
                    </div>
                  </div>

                  {/* Vehicle entries repeater */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Vehicle Trip Entries
                    </label>
                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                      {form.vehicles.map((v, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl border border-gray-100 sm:border-0">
                          <div className="flex-1">
                            <input type="text" required placeholder="Vehicle Plate (e.g. UP32AT1234)" value={v.vehicle_number}
                              onChange={(e) => handleVehicleChange(index, 'vehicle_number', e.target.value)}
                              className="w-full px-3 py-2 bg-white sm:bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono" />
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 sm:w-24 sm:flex-initial">
                              <input type="number" required min="1" placeholder="Trips" value={v.trip_number}
                                onChange={(e) => handleVehicleChange(index, 'trip_number', e.target.value)}
                                className="w-full px-3 py-2 bg-white sm:bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
                            </div>
                            <button type="button" onClick={() => handleRemoveVehicleRow(index)}
                              className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100" title="Delete Row">
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={handleAddVehicleRow}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all inline-flex items-center justify-center gap-1.5 bg-gray-50/50">
                      <FiPlus className="w-4 h-4" /> Add Vehicle
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button type="submit" disabled={submitting}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                      {submitting ? 'Saving...' : editingSheet ? 'Update Trip Sheet' : 'Save Trip Sheet'}
                    </button>
                    {editingSheet && (
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

          {/* Right: Search & Filters & Card list */}
          <div className={`${canEdit ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-4`}>
            {/* Search & Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative col-span-1">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search by vehicle plate..."
                      value={searchVehicle} onChange={(e) => { setSearchVehicle(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <div className="relative col-span-1">
                    <input type="date" placeholder="Search by specific date..."
                      value={searchDate} onChange={(e) => { setSearchDate(e.target.value); setCurrentPage(1); }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <div className="col-span-1">
                    <select value={tripTypeFilter} onChange={(e) => { setTripTypeFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                      <option value="all">All Trip Sheets</option>
                      <option value="Day">☀️ Day Sheets</option>
                      <option value="Night">🌙 Night Sheets</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
                  <span className="text-xs font-semibold text-gray-400 mr-1">Date Range Preset:</span>
                  <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    {dateFilterOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {dateFilter === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setCurrentPage(1); }}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2" />
                      <span className="text-xs text-gray-400">to</span>
                      <input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setCurrentPage(1); }}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2" />
                    </div>
                  )}

                  {(searchVehicle || searchDate || tripTypeFilter !== 'all' || dateFilter !== 'all') && (
                    <button onClick={() => { setSearchVehicle(''); setSearchDate(''); setTripTypeFilter('all'); setDateFilter('all'); setCustomStart(''); setCustomEnd(''); setCurrentPage(1); }}
                      className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all">
                      <FiX className="w-3.5 h-3.5" /> Clear Filters
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50">
                <button onClick={() => exportToCSV(trips, `Trips_${selectedProject.project_name}`, [
                  { key: 'trip_type', label: 'Trip Type' },
                  { key: 'trip_date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
                  { key: 'trip_number', label: 'Trip Number' },
                  { key: 'vehicle_number', label: 'Vehicle Number' }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiDownload className="w-3.5 h-3.5" /> CSV Export
                </button>
                <button onClick={() => printTable(`Trip Records - ${selectedProject.project_name}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all">
                  <FiPrinter className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>

            {/* Card List UI */}
            {loadingTrips ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : paginatedSheets.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <FiNavigation className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No trip sheets found</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {searchVehicle || searchDate || tripTypeFilter !== 'all' || dateFilter !== 'all'
                    ? 'No sheets match your search or filters.'
                    : 'No trip sheets recorded for this project yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="printable-table">
                  {paginatedSheets.map((sheet) => {
                    const sheetKey = `${sheet.trip_date}_${sheet.trip_type}`;
                    const isExpanded = expandedSheetKeys[sheetKey];
                    const totalTripsForSheet = sheet.vehicles.reduce((acc, v) => acc + (parseInt(v.trip_number) || 0), 0);

                    return (
                      <div key={sheetKey} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-gray-900">
                              <FiCalendar className="text-blue-500 w-4 h-4" />
                              {new Date(sheet.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              sheet.trip_type === 'Day'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {sheet.trip_type === 'Day' ? <FiSun className="w-3 h-3 text-amber-500" /> : <FiMoon className="w-3 h-3 text-indigo-500" />}
                              {sheet.trip_type} Trip
                            </span>
                          </div>

                          {/* Card Body Info */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <FiTruck className="text-gray-400 w-4 h-4" />
                              <span><strong>{sheet.vehicles.length}</strong> {sheet.vehicles.length === 1 ? 'Vehicle' : 'Vehicles'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FiNavigation className="text-gray-400 w-4 h-4" />
                              <span>Total Trips: <strong>{totalTripsForSheet}</strong></span>
                            </div>
                          </div>

                          {/* Expanded List Breakdown */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600 font-medium overflow-hidden"
                              >
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Vehicle Breakdown:</p>
                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                  {sheet.vehicles.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                      <span className="font-mono font-semibold text-gray-800">{v.vehicle_number}</span>
                                      <span className="text-gray-500">{v.trip_number} {v.trip_number === 1 ? 'trip' : 'trips'}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Card Action footer */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                          <button onClick={() => toggleExpandSheet(sheetKey)}
                            className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-all inline-flex items-center justify-center gap-1">
                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => handleEditClick(sheet)}
                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-100" title="Edit Trip Sheet">
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteConfirmSheet(sheet)}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100" title="Delete Trip Sheet">
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {filteredSheets.length > ROWS_PER_PAGE && (
                  <div className="px-6 py-4 border border-gray-100 bg-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredSheets.length)} of {filteredSheets.length} sheets
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
                              currentPage === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
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
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmSheet && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmSheet(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center z-10 border border-gray-100">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Trip Sheet?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete the trip sheet for <strong>{new Date(deleteConfirmSheet.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({deleteConfirmSheet.trip_type} Trip)</strong>? This will delete all vehicle entries inside it.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setDeleteConfirmSheet(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold">Cancel</button>
                  <button onClick={async () => {
                    try {
                      await projectTripsAPI.deleteSheet(selectedProject.id, deleteConfirmSheet.trip_date, deleteConfirmSheet.trip_type);
                      setDeleteConfirmSheet(null);
                      fetchTrips(selectedProject.id);
                      if (editingSheet && editingSheet.trip_date === deleteConfirmSheet.trip_date && editingSheet.trip_type === deleteConfirmSheet.trip_type) {
                        handleCancelEdit();
                      }
                      toast.success('Trip sheet deleted successfully!');
                    } catch (err) { toast.error('Failed to delete trip sheet.'); }
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
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip & Dispatch Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a project to manage its trips and dispatches.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by Project Name..." value={projectSearchQuery}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
        </div>
      </motion.div>
      <motion.div variants={itemVariants}>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <FiFolder className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400">
              {projectSearchQuery ? 'No projects match your search.' : 'Please create a project first.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {filteredProjects.map((project) => (
                <div key={project.id} onClick={() => setSelectedProject(project)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50/50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <FiFolder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {project.project_name || project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Manager: <span className="font-medium text-gray-700">{project.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Trip Workspace</span>
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

export default Trips;
