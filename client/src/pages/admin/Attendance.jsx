import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, FiCheckCircle, FiXCircle, FiClock, 
  FiUserCheck, FiUsers, FiSearch, FiSave, FiRefreshCw,
  FiFilter, FiCheck, FiX, FiAlertCircle, FiFolder, FiArrowLeft, FiChevronRight, FiUser
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { workforceAPI, projectsAPI } from '../../services/api';
import useCanEdit from '../../hooks/useCanEdit';

const STATUS_OPTIONS = [
  { id: 'present', label: 'Present', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100', active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
  { id: 'absent', label: 'Absent', color: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100', active: 'bg-red-600 text-white border-red-600 shadow-sm' },
  { id: 'half_day', label: 'Half Day', color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100', active: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
  { id: 'overtime', label: 'Overtime', color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100', active: 'bg-blue-600 text-white border-blue-600 shadow-sm' },
];

const Attendance = () => {
  const canEdit = useCanEdit();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // null = Project Selection View
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Local attendance state dictionary: { [worker_id]: { status, check_in, check_out, notes } }
  const [attendanceMap, setAttendanceMap] = useState({});

  // Fetch projects list
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectsAPI.getAll({ all: true });
        if (res.data?.success) setProjects(res.data.data || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch daily attendance
  const fetchDailyAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workforceAPI.getDailyAttendance(selectedDate);
      const list = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : [];

      setWorkers(list);

      // Map initial state from list
      const initialMap = {};
      list.forEach(w => {
        const wId = w.worker_id || w.id;
        initialMap[wId] = {
          status: w.attendance_status || 'present',
          check_in: w.check_in || '09:00',
          check_out: w.check_out || '18:00',
          notes: w.attendance_notes || ''
        };
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      toast.error('Failed to load daily attendance records');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyAttendance();
  }, [fetchDailyAttendance]);

  // Filtered workers list based on selected project and search/type
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesSearch = !searchTerm || 
        w.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.worker_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.phone?.includes(searchTerm);

      const workerProjId = w.current_project_id || w.project_id;
      const matchesProject = !selectedProject || selectedProject === 'ALL' || String(workerProjId) === String(selectedProject.id || selectedProject);
      const matchesType = !selectedType || 
        w.worker_type?.toLowerCase() === selectedType.toLowerCase() ||
        (selectedType === 'daily' && (w.worker_type?.toLowerCase() === 'daily_wage' || w.worker_type?.toLowerCase() === 'daily'));

      return matchesSearch && matchesProject && matchesType;
    });
  }, [workers, searchTerm, selectedProject, selectedType]);

  // Count active workers per project for the project selection cards
  const projectWorkerCounts = useMemo(() => {
    const counts = {};
    workers.forEach(w => {
      const pId = w.current_project_id || w.project_id;
      if (pId) {
        counts[pId] = (counts[pId] || 0) + 1;
      }
    });
    return counts;
  }, [workers]);

  // Summary counts for current filtered list
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let overtime = 0;

    filteredWorkers.forEach(w => {
      const st = attendanceMap[w.worker_id]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'half_day') halfDay++;
      else if (st === 'overtime') overtime++;
    });

    return { total: filteredWorkers.length, present, absent, halfDay, overtime };
  }, [filteredWorkers, attendanceMap]);

  // Status toggle handler
  const handleStatusChange = (workerId, newStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        status: newStatus
      }
    }));
  };

  // Field change handler
  const handleFieldChange = (workerId, field, value) => {
    setAttendanceMap(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value
      }
    }));
  };

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    setAttendanceMap(prev => {
      const nextMap = { ...prev };
      filteredWorkers.forEach(w => {
        nextMap[w.worker_id] = {
          ...nextMap[w.worker_id],
          status: 'present'
        };
      });
      return nextMap;
    });
    toast.info('All visible workers set to Present');
  };

  // Save batch attendance
  const handleSaveBatch = async () => {
    setSaving(true);
    try {
      const recordsPayload = filteredWorkers.map(w => {
        const wId = w.worker_id || w.id;
        const att = attendanceMap[wId] || {};
        return {
          worker_id: wId,
          name: w.name,
          status: att.status || 'present',
          check_in: att.check_in || '09:00',
          check_out: att.check_out || '18:00',
          notes: att.notes || ''
        };
      });

      const res = await workforceAPI.saveBatchAttendance({
        attendance_date: selectedDate,
        records: recordsPayload
      });

      if (res.data?.success) {
        toast.success(`Attendance saved successfully for ${selectedDate}!`);
        fetchDailyAttendance();
      }
    } catch (err) {
      console.error('Save attendance error:', err);
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // If no project is selected, show Project-Wise Cards View
  if (!selectedProject) {
    return (
      <div className="space-y-6 pb-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FiFolder className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Project-Wise Daily Attendance</h1>
                <p className="text-xs text-gray-500 font-medium">Select a project to log & manage attendance for assigned staff members</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              />
            </div>
            
            <button
              onClick={() => setSelectedProject('ALL')}
              className="mt-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FiUsers className="w-4 h-4" />
              <span>View All Projects</span>
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div className="py-20 flex justify-center items-center gap-3 text-gray-400 font-semibold text-sm bg-white rounded-2xl border border-gray-200">
            <div className="w-6 h-6 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <span>Loading projects and workforce...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 font-semibold flex flex-col items-center justify-center gap-2">
            <FiAlertCircle className="w-10 h-10 text-gray-300" />
            <span>No active projects found. Create a project to start logging attendance.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => {
              const staffCount = projectWorkerCounts[p.id] || 0;
              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => setSelectedProject(p)}
                  className="bg-white border border-gray-200 hover:border-amber-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <FiFolder className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                        {staffCount} Staff Members
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-amber-600 transition-colors">
                        {p.project_name || p.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                        <FiUser className="w-3.5 h-3.5 text-gray-400" />
                        Manager: <span className="text-gray-800 font-semibold">{p.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                    <span>Manage Attendance</span>
                    <FiChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        {/* Top bar with Back Button and Project Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer w-fit"
          >
            <FiArrowLeft className="w-4 h-4 text-gray-600" />
            <span>← Back to Projects List</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Switch Project:</span>
            <select
              value={selectedProject === 'ALL' ? 'ALL' : selectedProject.id}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') setSelectedProject('ALL');
                else {
                  const proj = projects.find(p => String(p.id) === String(val));
                  if (proj) setSelectedProject(proj);
                }
              }}
              className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer"
            >
              <option value="ALL">All Projects (Combined)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_name || p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FiUserCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  {selectedProject === 'ALL' ? 'All Projects Attendance Register' : `Attendance Register: ${selectedProject.project_name || selectedProject.name}`}
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {selectedProject === 'ALL' ? 'Showing attendance across all active projects' : `Manager: ${selectedProject.manager_name || 'Unassigned'}`}
                </p>
              </div>
            </div>
          </div>

        {/* Date Selector & Save Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            />
          </div>

          {canEdit && (
            <div className="flex items-end h-full pt-4">
              <button
                onClick={handleSaveBatch}
                disabled={saving || loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSave className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gray-400" />
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Active</span>
          <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm relative overflow-hidden bg-emerald-50/20">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Present</span>
          <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.present}</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm relative overflow-hidden bg-red-50/20">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500" />
          <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Absent</span>
          <p className="text-2xl font-black text-red-700 mt-0.5">{stats.absent}</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden bg-amber-50/20">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
          <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Half Day</span>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{stats.halfDay}</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm relative overflow-hidden bg-blue-50/20">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500" />
          <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Overtime</span>
          <p className="text-2xl font-black text-blue-700 mt-0.5">{stats.overtime}</p>
        </div>
      </div>

      {/* Filters & Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by worker name, code, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none bg-white"
            >
              <option value="">All Staff Types</option>
              <option value="permanent font-medium">Permanent</option>
              <option value="contract font-medium">Contract</option>
              <option value="daily font-medium">Daily Wages</option>
            </select>

            {canEdit && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center gap-2 text-gray-400 font-semibold text-xs">
            <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <span>Loading workforce attendance...</span>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-semibold flex flex-col items-center justify-center gap-2">
            <FiAlertCircle className="w-8 h-8 text-gray-300" />
            <span>No staff records found for this project on selected date.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Worker Info</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Project & Role</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Daily Status</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timing</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWorkers.map(w => {
                  const currentAtt = attendanceMap[w.worker_id] || { status: 'present', check_in: '09:00', check_out: '18:00', notes: '' };

                  return (
                    <tr key={w.worker_id} className="hover:bg-gray-50/40 transition-colors">
                      {/* Worker Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center border border-blue-100 shrink-0">
                            {w.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{w.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono font-semibold">{w.worker_code} • {w.phone || 'No Phone'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Project & Role */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-800 text-xs">{w.designation || 'Worker'}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{w.project_name || 'Unassigned'}</div>
                        </div>
                      </td>

                      {/* Status Pills Selector */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-xl">
                          {STATUS_OPTIONS.map(opt => {
                            const isSelected = currentAtt.status === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => handleStatusChange(w.worker_id, opt.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                  isSelected ? opt.active : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                } disabled:cursor-not-allowed`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Check-in / Check-out Timing */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={currentAtt.check_in || '09:00'}
                            disabled={!canEdit || currentAtt.status === 'absent'}
                            onChange={(e) => handleFieldChange(w.worker_id, 'check_in', e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-semibold text-gray-700 disabled:opacity-40"
                          />
                          <span className="text-gray-300 font-bold">-</span>
                          <input
                            type="time"
                            value={currentAtt.check_out || '18:00'}
                            disabled={!canEdit || currentAtt.status === 'absent'}
                            onChange={(e) => handleFieldChange(w.worker_id, 'check_out', e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-semibold text-gray-700 disabled:opacity-40"
                          />
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={currentAtt.notes || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleFieldChange(w.worker_id, 'notes', e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
