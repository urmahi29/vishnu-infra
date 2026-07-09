import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFolder, FiUser, FiTruck, FiUsers, FiPlus, FiChevronRight,
  FiArrowLeft, FiTrash2, FiEdit2, FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
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

// ─── CREATE/EDIT PROJECT MODAL ───
const ProjectModal = ({ isOpen, onClose, onSave, project = null }) => {
  const [projectName, setProjectName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setProjectName(project.project_name || project.name || '');
      setManagerName(project.manager_name || '');
    } else {
      setProjectName('');
      setManagerName('');
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !managerName.trim()) return;

    try {
      setLoading(true);
      await onSave({ project_name: projectName, manager_name: managerName });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Create Project'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Project Manager Name
            </label>
            <input
              type="text"
              required
              placeholder="Project Manager"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── STAFF MANAGEMENT ───
const StaffTab = ({ projectId, canEdit }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getStaff(projectId);
      setStaff(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [projectId]);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setName('');
    setRole('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setName(member.staff_name);
    setRole(member.work_role);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    try {
      setSaving(true);
      if (editingMember) {
        await projectsAPI.editStaff(projectId, editingMember.id, { staff_name: name, work_role: role });
        toast.success('Staff member updated successfully!');
      } else {
        await projectsAPI.addStaff(projectId, { staff_name: name, work_role: role });
        toast.success('Staff member added successfully!');
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err?.message || 'Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await projectsAPI.deleteStaff(projectId, id);
      toast.success('Staff member deleted successfully!');
      fetchStaff();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err?.message || 'Failed to delete staff member.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Staff Management</h3>
        {canEdit && (
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          Add Staff
        </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading staff...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No staff members added to this project yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Work</th>
                {canEdit && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-55/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{member.staff_name}</td>
                  <td className="px-6 py-4 text-gray-600">{member.work_role}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
          {canEdit && (
          <button
            onClick={() => handleOpenEdit(member)}
            className="p-1.5 text-gray-450 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Edit Staff"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          )}
          {canEdit && (
          <button
            onClick={() => handleDelete(member.id)}
            className="p-1.5 text-gray-455 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Staff"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingMember ? 'Edit Staff' : 'Add Staff'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Work Assigned / Job Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Work Assigned / Job Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── VEHICLE MANAGEMENT ───
const VehicleTab = ({ projectId, canEdit }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getVehicles(projectId);
      setVehicles(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [projectId]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setName('');
    setPlate('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVehicle(v);
    setName(v.vehicle_name);
    setPlate(v.vehicle_number);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !plate.trim()) return;

    try {
      setSaving(true);
      if (editingVehicle) {
        await projectsAPI.editVehicle(projectId, editingVehicle.id, { vehicle_name: name, vehicle_number: plate });
      } else {
        await projectsAPI.addVehicle(projectId, { vehicle_name: name, vehicle_number: plate });
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await projectsAPI.deleteVehicle(projectId, id);
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Vehicle Management</h3>
        {canEdit && (
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          Add Vehicle
        </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading vehicles...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <FiTruck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No vehicles added to this project yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Number Plate</th>
                {canEdit && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-55/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{v.vehicle_name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-105 px-2.5 py-1 rounded-md text-gray-700 font-semibold border border-gray-200">
                      {v.vehicle_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
          {canEdit && (
          <button
            onClick={() => handleOpenEdit(v)}
            className="p-1.5 text-gray-450 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Edit Vehicle"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          )}
          {canEdit && (
          <button
            onClick={() => handleDelete(v.id)}
            className="p-1.5 text-gray-455 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Vehicle"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vehicle Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Vehicle Number Plate
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vehicle Number Plate"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PROJECT WORKSPACE ───
const ProjectDetail = ({ projectId, onBack, canEdit, onEdit, onDelete, refreshTrigger }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'vehicle'

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getById(projectId);
      setProject(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading project workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-16">
        <FiFolder className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">{error || 'Project not found'}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
          ← Back to Projects
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.project_name || project.name}</h1>
            <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1.5">
              <FiUser className="w-4 h-4 text-gray-400" />
              Project Manager: <span className="text-gray-800 font-semibold">{project.manager_name}</span>
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(project)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
              title="Edit Project"
            >
              <FiEdit2 className="w-4 h-4" /> Edit Project
            </button>
            <button
              onClick={() => onDelete(project)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all shadow-sm"
              title="Delete Project"
            >
              <FiTrash2 className="w-4 h-4" /> Delete Project
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 p-1 bg-gray-100/80 border border-gray-200/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'staff'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FiUsers className="w-4 h-4" />
          Staff
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'vehicle'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FiTruck className="w-4 h-4" />
          Vehicle
        </button>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">          {activeTab === 'staff' ? (
          <StaffTab projectId={projectId} canEdit={canEdit} />
        ) : (
          <VehicleTab projectId={projectId} canEdit={canEdit} />
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── MAIN PROJECTS PAGE ───
const ProjectsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/user';

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) fetchProjects();
  }, [id]);

  const handleSaveProject = async (data) => {
    try {
      if (editingProject) {
        await projectsAPI.update(editingProject.id, data);
        toast.success('Project updated successfully!');
        setEditingProject(null);
      } else {
        await projectsAPI.create(data);
        toast.success('Project created successfully!');
      }
      setRefreshTrigger(prev => prev + 1);
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save project.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted successfully!');
      setDeleteConfirmProject(null);
      setRefreshTrigger(prev => prev + 1);
      fetchProjects();
      navigate(`${basePath}/projects`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete project.');
    }
  };

  const canEdit = useCanEdit();

  // If ID exists in route params, render Project Workspace
  if (id) {
    return (
      <ProjectDetail
        projectId={id}
        onBack={() => navigate(`${basePath}/projects`)}
        canEdit={canEdit}
        onEdit={(proj) => {
          setEditingProject(proj);
          setIsModalOpen(true);
        }}
        onDelete={(proj) => {
          setDeleteConfirmProject(proj);
        }}
        refreshTrigger={refreshTrigger}
      />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {canEdit && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          Create Project
        </button>
        )}
      </motion.div>

      {/* Project List */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <FiFolder className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400 mb-4">Get started by creating your first project.</p>
            {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              <FiPlus className="w-4 h-4" />
              Create Project
            </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`${basePath}/projects/${project.id}`)}
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
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all animate-none"
                          title="Edit Project Name"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProject(project)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all animate-none"
                          title="Delete Project"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Open Workspace</span>
                      <FiChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ProjectModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingProject(null);
            }}
            onSave={handleSaveProject}
            project={editingProject}
          />
        )}
      </AnimatePresence>

      {/* Delete Project Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Project?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete the project <strong>{deleteConfirmProject.project_name || deleteConfirmProject.name}</strong>? This will delete all staff, vehicles, and logs associated with it.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirmProject(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProject(deleteConfirmProject.id)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-sm transition-all shadow-lg shadow-red-200"
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
};

export default ProjectsPage;
