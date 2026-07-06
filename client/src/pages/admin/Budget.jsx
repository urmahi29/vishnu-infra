import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDollarSign, FiFolder, FiChevronRight, FiArrowLeft, FiUser, FiTrash2, FiEdit2, FiCalendar, FiFileText } from 'react-icons/fi';
import useCanEdit from '../../hooks/useCanEdit';
import { projectsAPI, budgetAPI } from '../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

const AdminBudget = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Form state
  const [form, setForm] = useState({
    amount: '',
    description: '',
    paid_by: '',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [editingExpense, setEditingExpense] = useState(null);
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

  // Fetch expenses for selected project
  const fetchExpenses = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingExpenses(true);
      const res = await budgetAPI.getProjectExpenses(projectId);
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    
    // Poll every 30s so newly created projects appear automatically
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchExpenses(selectedProject.id);
      // Reset form and editing state
      setForm({
        amount: '',
        description: '',
        paid_by: '',
        expense_date: new Date().toISOString().split('T')[0]
      });
      setEditingExpense(null);
    } else {
      setExpenses([]);
    }
  }, [selectedProject, fetchExpenses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!selectedProject || !form.amount || !form.description || !form.paid_by || !form.expense_date) {
      alert('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingExpense) {
        // Edit expense
        await budgetAPI.updateProjectExpense(editingExpense.id, {
          amount: parseFloat(form.amount),
          description: form.description,
          paid_by: form.paid_by,
          expense_date: form.expense_date
        });
      } else {
        // Create expense
        await budgetAPI.createProjectExpense({
          project_id: parseInt(selectedProject.id),
          amount: parseFloat(form.amount),
          description: form.description,
          paid_by: form.paid_by,
          expense_date: form.expense_date
        });
      }

      // Reset form
      setForm({
        amount: '',
        description: '',
        paid_by: '',
        expense_date: new Date().toISOString().split('T')[0]
      });
      setEditingExpense(null);
      fetchExpenses(selectedProject.id);
    } catch (err) {
      console.error('Failed to save expense:', err);
      alert(err?.message || 'Failed to save expense record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setForm({
      amount: expense.amount.toString(),
      description: expense.description,
      paid_by: expense.paid_by,
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setForm({
      amount: '',
      description: '',
      paid_by: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  // Calculate summary metrics
  const totalExpensesSum = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

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
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Budget Workspace: {selectedProject.project_name || selectedProject.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-gray-400" />
                Manager: <span className="text-gray-800 font-semibold">{selectedProject.manager_name || 'Unassigned'}</span>
              </p>
            </div>
          </div>              {/* Expense Management */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form */}
            {canEdit && (
            <div className="lg:col-span-1 space-y-6">
              {/* Total Expenses Summary */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden font-sans">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
                      <p className="text-3xl font-extrabold mt-1 tracking-tight">
                        ₹{totalExpensesSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <FiDollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                  <FiDollarSign className="text-emerald-500" />
                  {editingExpense ? 'Edit Expense Record' : 'Record Daily Expense'}
                </h3>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div>
                    <label htmlFor="expense-amount" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Expense Amount (₹) *
                    </label>
                    <input
                      id="expense-amount"
                      type="number"
                      name="amount"
                      required
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="expense-description" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Expense Description *
                    </label>
                    <textarea
                      id="expense-description"
                      name="description"
                      required
                      placeholder="Explain what the money was spent on..."
                      rows="3"
                      value={form.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="expense-paid-by" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Paid By *
                    </label>
                    <input
                      id="expense-paid-by"
                      type="text"
                      name="paid_by"
                      required
                      placeholder="Name of the person who paid"
                      value={form.paid_by}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="expense-date" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Date *
                    </label>
                    <input
                      id="expense-date"
                      type="date"
                      name="expense_date"
                      required
                      value={form.expense_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                    </button>
                    {editingExpense && (
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
            </div>
            )}

            {/* Right Column: Table List */}
            <div className={`${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Expense list</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    {expenses.length} records
                  </span>
                </div>

                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-16">
                    <FiFileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No expenses recorded for this project yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Paid By</th>
                          {canEdit && <th className="px-6 py-3 text-xs font-bold text-gray-500 tracking-wider text-right uppercase">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-600">
                              {new Date(exp.expense_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900 font-mono">
                              ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate" title={exp.description}>
                              {exp.description}
                            </td>
                            <td className="px-6 py-4 text-gray-700 font-medium">{exp.paid_by}</td>
                            {canEdit && (
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => handleEditClick(exp)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Edit Expense"
                                  >
                                    <FiEdit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(exp.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Expense"
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Expense Record?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete this expense record? This action cannot be undone.
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
                        await budgetAPI.deleteProjectExpense(deleteConfirmId);
                        setDeleteConfirmId(null);
                        fetchExpenses(selectedProject.id);
                        if (editingExpense?.id === deleteConfirmId) {
                          handleCancelEdit();
                        }
                      } catch (err) {
                        console.error('Failed to delete expense:', err);
                        alert('Failed to delete expense record.');
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
          <h1 className="text-2xl font-bold text-gray-900">Budget & Finance</h1>
          <p className="text-gray-500 mt-1 text-sm">Select a project to manage its daily expenses and budget records.</p>
        </div>
      </motion.div>

      {/* Project List */}
      <motion.div variants={itemVariants}>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
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
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                      <FiFolder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {project.project_name || project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Manager: <span className="font-medium text-gray-700">{project.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Budget Workspace</span>
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

export default AdminBudget;
