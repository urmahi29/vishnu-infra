import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiFolder, FiChevronRight, FiArrowLeft, FiUser, FiTrash2, FiEdit2, FiCalendar, FiDollarSign } from 'react-icons/fi';
import useCanEdit from '../../hooks/useCanEdit';
import { projectsAPI } from '../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

const Workforce = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form state
  const [form, setForm] = useState({
    staff_name: '',
    joining_date: new Date().toISOString().split('T')[0],
    end_date: '',
    salary: ''
  });
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const canEdit = useCanEdit();

  // Fetch projects list
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch staff for selected project
  const fetchStaff = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingStaff(true);
      const res = await projectsAPI.getStaff(projectId);
      setStaffList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchStaff(selectedProject.id);
      // Reset form and editing state
      setForm({
        staff_name: '',
        joining_date: new Date().toISOString().split('T')[0],
        end_date: '',
        salary: ''
      });
      setEditingStaff(null);
    } else {
      setStaffList([]);
    }
  }, [selectedProject, fetchStaff]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!selectedProject || !form.staff_name || !form.joining_date || form.salary === '') {
      alert('Staff Name, Joining Date, and Monthly Salary are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        staff_name: form.staff_name,
        joining_date: form.joining_date,
        end_date: form.end_date || null,
        salary: parseFloat(form.salary)
      };

      if (editingStaff) {
        // Edit staff
        await projectsAPI.editStaff(selectedProject.id, editingStaff.id, payload);
      } else {
        // Add staff
        await projectsAPI.addStaff(selectedProject.id, payload);
      }

      // Reset form
      setForm({
        staff_name: '',
        joining_date: new Date().toISOString().split('T')[0],
        end_date: '',
        salary: ''
      });
      setEditingStaff(null);
      fetchStaff(selectedProject.id);
    } catch (err) {
      console.error('Failed to save staff:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to save staff record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (staff) => {
    setEditingStaff(staff);
    setForm({
      staff_name: staff.staff_name,
      joining_date: staff.joining_date ? staff.joining_date.split('T')[0] : '',
      end_date: staff.end_date ? staff.end_date.split('T')[0] : '',
      salary: staff.salary.toString()
    });
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setForm({
      staff_name: '',
      joining_date: new Date().toISOString().split('T')[0],
      end_date: '',
      salary: ''
    });
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  // Calculate summary metrics
  const totalStaffCount = staffList.length;
  const totalSalarySum = staffList.reduce((sum, s) => sum + Number(s.salary), 0);

  // Format salary in Lakh/Crore notation
  const formatSalary = (amount) => {
    if (amount === 0) return '₹0';
    const crore = 10000000;
    const lakh = 100000;
    if (amount >= crore) {
      return `₹${(amount / crore).toFixed(2)} Crore`;
    }
    if (amount >= lakh) {
      return `₹${(amount / lakh).toFixed(2)} Lakh`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const exactSalary = totalSalarySum > 0 ? `₹${totalSalarySum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0';

  // ---- Workspace view (project selected) ----
  if (selectedProject) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      >
        <button
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
        >
          <FiArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Workspace Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-6">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <FiUsers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Workforce Workspace: {selectedProject.project_name || selectedProject.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-gray-400" />
                Manager: <span className="text-gray-800 font-semibold">{selectedProject.manager_name || 'Unassigned'}</span>
              </p>
            </div>
          </div>

          {/* Staff Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form & Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Premium Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Staff Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group cursor-default"
                >
                  {/* Gold accent stripe at top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-t-2xl" />
                  
                  {/* Subtle gold glow */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500" />
                  
                  <div className="relative z-10 flex flex-col gap-3">
                    {/* Icon + Label row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">
                        Total Staff
                      </span>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-200/50">
                        <FiUsers className="w-5 h-5" />
                      </div>
                    </div>
                    
                    {/* Value */}
                    <div>
                      <p className="text-3xl font-extrabold text-gray-900 leading-none tracking-tight">
                        {totalStaffCount}
                      </p>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-gray-400 font-medium">
                      Active team members
                    </p>
                  </div>
                </motion.div>

                {/* Total Monthly Salary Card */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative bg-white rounded-2xl border border-amber-200/60 shadow-lg shadow-amber-900/5 p-5 overflow-hidden group cursor-default"
                >
                  {/* Gold accent stripe at top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-t-2xl" />
                  
                  {/* Subtle gold glow */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl group-hover:bg-amber-400/10 transition-all duration-500" />
                  
                  <div className="relative z-10 flex flex-col gap-3">
                    {/* Icon + Label row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em]">
                        Total Monthly Salary
                      </span>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-200/50">
                        <FiDollarSign className="w-5 h-5" />
                      </div>
                    </div>
                    
                    {/* Formatted Salary with tooltip */}
                    <div className="relative group" title={exactSalary}>
                      <p className="text-2xl font-extrabold text-gray-900 leading-none tracking-tight">
                        {formatSalary(totalSalarySum)}
                      </p>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-gray-400 font-medium">
                      Combined payroll of selected project
                    </p>
                  </div>
                </motion.div>
              </div>

              {canEdit && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                  <FiUsers className="text-blue-500" />
                  {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
                <form onSubmit={handleSaveStaff} className="space-y-4">
                  <div>
                    <label htmlFor="staff-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Staff Name *
                    </label>
                    <input
                      id="staff-name"
                      type="text"
                      name="staff_name"
                      required
                      placeholder="e.g. Amit Sharma"
                      value={form.staff_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="joining-date" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Joining Date *
                    </label>
                    <input
                      id="joining-date"
                      type="date"
                      name="joining_date"
                      required
                      value={form.joining_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="end-date" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      End Date (Optional)
                    </label>
                    <input
                      id="end-date"
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="monthly-salary" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Monthly Salary (₹) *
                    </label>
                    <input
                      id="monthly-salary"
                      type="number"
                      name="salary"
                      required
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={form.salary}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : editingStaff ? 'Update Staff' : 'Save Staff'}
                    </button>
                    {editingStaff && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              )}
            </div>

            {/* Right Column: Table List */}
            <div className={`${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Staff list</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    {staffList.length} members
                  </span>
                </div>

                {loadingStaff ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-16">
                    <FiCalendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No staff records added for this project yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Name</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Joining Date</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Salary (₹)</th>
                          {canEdit && <th className="px-6 py-3 text-xs font-bold text-gray-500 tracking-wider text-right uppercase">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staffList.map((staff) => (
                          <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900">{staff.staff_name}</td>
                            <td className="px-6 py-4 text-gray-600 font-medium">
                              {new Date(staff.joining_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 text-gray-600 font-medium">
                              {staff.end_date ? new Date(staff.end_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }) : '—'}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900 font-mono">
                              ₹{Number(staff.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            {canEdit && (
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleEditClick(staff)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit Staff Member"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(staff.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Staff Member"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setDeleteConfirmId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center z-10 border border-gray-100"
              >
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Staff Record?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete this staff record? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await projectsAPI.deleteStaff(selectedProject.id, deleteConfirmId);
                        setDeleteConfirmId(null);
                        fetchStaff(selectedProject.id);
                        if (editingStaff?.id === deleteConfirmId) {
                          handleCancelEdit();
                        }
                      } catch (err) {
                        console.error('Failed to delete staff:', err);
                        alert('Failed to delete staff record.');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg shadow-red-200"
                  >
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

  // ---- Project list view (no project selected) ----
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce & Staff</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a project to manage its staff records and payroll.</p>
        </div>
      </motion.div>

      {/* Project List */}
      <motion.div variants={itemVariants}>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50/50 cursor-pointer group transition-all"
                >
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
                    <span>Open Workforce Workspace</span>
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

export default Workforce;
