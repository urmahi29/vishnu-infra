import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiFolder, FiUser, FiTruck, FiUsers, FiChevronRight,
  FiArrowLeft, FiCalendar
} from 'react-icons/fi';
import { projectsAPI } from '../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

const StaffTab = ({ projectId }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getStaff(projectId);
      setStaff(res.data.data || []);
    } catch (err) {
      console.error(err);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { if (projectId) fetchStaff(); }, [projectId, fetchStaff]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <FiUsers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No staff assigned to this project yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Name</th>
            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Role</th>
            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {staff.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5 font-semibold text-gray-900">{s.staff_name || s.name}</td>
              <td className="px-5 py-3.5 text-gray-600">{s.work_role || s.designation || '—'}</td>
              <td className="px-5 py-3.5 text-gray-500">
                {s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const VehicleTab = ({ projectId }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getVehicles(projectId);
      setVehicles(res.data.data || []);
    } catch (err) {
      console.error(err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { if (projectId) fetchVehicles(); }, [projectId, fetchVehicles]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <FiTruck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No vehicles assigned to this project yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Name</th>
            <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Number Plate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5 font-semibold text-gray-900">{v.vehicle_name || v.name}</td>
              <td className="px-5 py-3.5">
                <span className="font-mono text-xs bg-gray-100 px-2.5 py-1 rounded-md text-gray-700 font-semibold">
                  {v.vehicle_number}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const UserProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('staff');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await projectsAPI.getAll();
        setProjects(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Project Workspace View
  if (selectedProject) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-5 max-w-6xl mx-auto">
        <button onClick={() => { setSelectedProject(null); setActiveTab('staff'); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
          <FiArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-gray-100">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <FiFolder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedProject.project_name || selectedProject.name}</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-gray-400" />
                Manager: <span className="text-gray-800 font-semibold">{selectedProject.manager_name || 'Unassigned'}</span>
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-gray-100/80 border border-gray-200/50 rounded-xl w-fit mb-6">
            <button onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'staff' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <FiUsers className="w-4 h-4" /> Staff
            </button>
            <button onClick={() => setActiveTab('vehicle')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'vehicle' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-600 hover:text-gray-900'
              }`}>
              <FiTruck className="w-4 h-4" /> Vehicles
            </button>
          </div>

          {activeTab === 'staff' ? <StaffTab projectId={selectedProject.id} /> : <VehicleTab projectId={selectedProject.id} />}
        </div>
      </motion.div>
    );
  }

  // Project List View
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1 text-sm">View all projects managed by the admin.</p>
        </div>
        <span className="text-sm font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
          {projects.length} total
        </span>
      </motion.div>

      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <FiFolder className="w-14 h-14 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400">There are no projects created yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
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
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <FiUser className="w-3.5 h-3.5" />
                        Manager: <span className="font-medium text-gray-700">{project.manager_name || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View Details</span>
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

export default UserProjects;
