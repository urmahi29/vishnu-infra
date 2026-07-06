import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiFile, FiFileText, FiImage, FiSearch, FiDownload, 
  FiFolder, FiAlertCircle, FiEye, FiCalendar, FiUser, FiTruck, 
  FiAlertTriangle, FiCheckCircle, FiX, FiRefreshCw, FiArchive, 
  FiArrowLeft
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import api, { documentsAPI, projectsAPI } from '../../services/api';

const VEHICLE_TYPES = [
  'Truck', 'Dumper', 'JCB', 'Excavator', 'Loader', 'Crane', 
  'Water Tanker', 'Pickup', 'Tractor', 'Roller', 'Other'
];

const DOCUMENT_CATEGORIES = [
  'RC Book', 'Insurance', 'Fitness Certificate', 'Pollution Certificate (PUC)',
  'Permit', 'National Permit', 'Road Tax', 'Vehicle Invoice', 'Purchase Bill', 
  'Service Record', 'Maintenance Record', 'Other'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_STYLES = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_use: 'bg-blue-50 text-blue-700 border-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  out_of_service: 'bg-red-50 text-red-700 border-red-200',
  retired: 'bg-gray-50 text-gray-600 border-gray-200'
};

const DOCUMENT_GROUPS = [
  { label: 'Registration (RC)', key: 'rc', categories: ['RC Book'] },
  { label: 'Insurance', key: 'insurance', categories: ['Insurance'] },
  { label: 'Fitness Certificate', key: 'fitness', categories: ['Fitness Certificate'] },
  { label: 'Pollution Certificate (PUC)', key: 'puc', categories: ['Pollution Certificate (PUC)'] },
  { label: 'Permit', key: 'permit', categories: ['Permit', 'National Permit'] },
  { label: 'Tax Receipt', key: 'tax', categories: ['Road Tax'] },
  { label: 'Invoice', key: 'invoice', categories: ['Vehicle Invoice'] },
  { label: 'Purchase Bill', key: 'bill', categories: ['Purchase Bill'] },
  { label: 'Other Documents', key: 'other', categories: ['Service Record', 'Maintenance Record', 'Other'] }
];

// Helper to determine expiry status of a single document
const getDocExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { label: 'Active', badge: 'bg-green-50 text-green-700 border border-green-200', status: 'active' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  thirtyDaysFromNow.setHours(23, 59, 59, 999);

  const exp = new Date(expiryDate);
  if (exp < today) {
    return { label: 'Expired', badge: 'bg-red-50 text-red-700 border border-red-200', status: 'expired' };
  }
  if (exp >= today && exp <= thirtyDaysFromNow) {
    const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    return { label: `Expiring in ${days}d`, badge: 'bg-amber-50 text-amber-700 border border-amber-200', status: 'expiring' };
  }
  return { label: 'Active', badge: 'bg-green-50 text-green-700 border border-green-200', status: 'active' };
};

// Helper to determine the worst expiry status for a vehicle folder
const getVehicleExpiryStatus = (vehicleDocs) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  thirtyDaysFromNow.setHours(23, 59, 59, 999);

  let expiredList = [];
  let expiringSoonList = [];

  vehicleDocs.forEach(d => {
    if (d.expiry_date) {
      const exp = new Date(d.expiry_date);
      if (exp < today) {
        expiredList.push(d);
      } else if (exp >= today && exp <= thirtyDaysFromNow) {
        const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        expiringSoonList.push({ doc: d, daysLeft });
      }
    }
  });

  if (expiredList.length > 0) {
    return {
      text: `${expiredList.length} Expired Doc(s)`,
      color: 'text-red-700 bg-red-50 border-red-100',
      dot: 'bg-red-500',
      status: 'expired'
    };
  }

  if (expiringSoonList.length > 0) {
    return {
      text: `${expiringSoonList.length} Expiring Soon`,
      color: 'text-amber-700 bg-amber-50 border-amber-100',
      dot: 'bg-amber-500',
      status: 'expiring'
    };
  }

  return {
    text: 'All documents valid',
    color: 'text-green-700 bg-green-50 border-green-100',
    dot: 'bg-green-500',
    status: 'valid'
  };
};

// Helper to get stylized file icons based on filename extension
const getFileIcon = (fileName, fileType) => {
  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
  const type = fileType ? fileType.toLowerCase() : '';

  if (ext === 'pdf' || type.includes('pdf')) {
    return { icon: <FiFileText className="w-5 h-5" />, color: 'bg-red-50 text-red-600 border border-red-200' };
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || type.includes('image')) {
    return { icon: <FiImage className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600 border border-blue-200' };
  }
  if (['doc', 'docx'].includes(ext) || type.includes('word') || type.includes('msword')) {
    return { icon: <FiFileText className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-600 border border-indigo-200' };
  }
  if (['xls', 'xlsx'].includes(ext) || type.includes('excel') || type.includes('spreadsheet')) {
    return { icon: <FiFileText className="w-5 h-5" />, color: 'bg-green-50 text-green-600 border border-green-200' };
  }
  if (ext === 'zip' || type.includes('zip') || type.includes('compressed')) {
    return { icon: <FiArchive className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600 border border-amber-200' };
  }
  return { icon: <FiFile className="w-5 h-5" />, color: 'bg-gray-50 text-gray-500 border border-gray-200' };
};

const UserDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryMonthFilter, setExpiryMonthFilter] = useState('');

  const [projects, setProjects] = useState([]);
  const [activeVehicle, setActiveVehicle] = useState(null);
  
  // Vehicle Info Card state
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [loadingVehicleInfo, setLoadingVehicleInfo] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentsAPI.getAll({ all: true });
      if (res.data?.success) {
        const allDocs = res.data.data || [];
        const vehicleDocs = allDocs.filter(d => d.vehicle_number);
        setDocuments(vehicleDocs);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectsAPI.getAll({ limit: 200 });
      if (res.data?.success) setProjects(res.data.data);
    } catch (err) {}
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Fetch detailed equipment/vehicle info when a folder is opened
  const fetchVehicleInfo = async (vehicleNumber) => {
    try {
      setLoadingVehicleInfo(true);
      const res = await documentsAPI.getVehicleInfo(vehicleNumber);
      if (res.data?.success) {
        setVehicleInfo(res.data.data);
      } else {
        setVehicleInfo(null);
      }
    } catch (err) {
      console.error(err);
      setVehicleInfo(null);
    } finally {
      setLoadingVehicleInfo(false);
    }
  };

  useEffect(() => {
    if (activeVehicle) {
      fetchVehicleInfo(activeVehicle.vehicle_number);
    } else {
      setVehicleInfo(null);
    }
  }, [activeVehicle]);

  // Synchronize activeVehicle with fresh data updates
  useEffect(() => {
    if (activeVehicle) {
      const plate = activeVehicle.vehicle_number;
      const matchedVehicleDocs = documents.filter(d => d.vehicle_number.toUpperCase().trim() === plate.toUpperCase().trim());
      if (matchedVehicleDocs.length > 0) {
        const d = matchedVehicleDocs[0];
        setActiveVehicle({
          vehicle_number: plate,
          vehicle_model: d.vehicle_model,
          vehicle_type: d.vehicle_type,
          project_id: d.project_id,
          project_name: d.project_name,
          documents: matchedVehicleDocs
        });
      } else {
        setActiveVehicle(null);
      }
    }
  }, [documents]);

  // Group docs by vehicle number plate
  const vehiclesMap = useMemo(() => {
    const map = {};
    documents.forEach((d) => {
      const plate = d.vehicle_number.toUpperCase().trim();
      if (!map[plate]) {
        map[plate] = {
          vehicle_number: plate,
          vehicle_model: d.vehicle_model,
          vehicle_type: d.vehicle_type,
          project_id: d.project_id,
          project_name: d.project_name,
          last_updated: d.updated_at || d.created_at,
          documents: []
        };
      }
      map[plate].documents.push(d);
      
      const docTime = new Date(d.updated_at || d.created_at).getTime();
      const currentLast = new Date(map[plate].last_updated).getTime();
      if (docTime > currentLast) {
        map[plate].last_updated = d.updated_at || d.created_at;
      }
    });
    return map;
  }, [documents]);

  const vehiclesList = useMemo(() => {
    return Object.values(vehiclesMap).sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
  }, [vehiclesMap]);

  // Compute metrics stats dashboard
  const stats = useMemo(() => {
    let totalVehicles = vehiclesList.length;
    let totalDocuments = documents.length;
    let expiring30Count = 0;
    let expiredCount = 0;

    documents.forEach((d) => {
      const status = getDocExpiryStatus(d.expiry_date).status;
      if (status === 'expired') {
        expiredCount++;
      } else if (status === 'expiring') {
        expiring30Count++;
      }
    });

    return {
      totalVehicles,
      totalDocuments,
      expiring30: expiring30Count,
      expired: expiredCount
    };
  }, [vehiclesList, documents]);

  // Filtered Vehicle Folders
  const filteredVehicles = useMemo(() => {
    let result = vehiclesList;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(v => 
        v.vehicle_number.toLowerCase().includes(q) ||
        v.vehicle_model.toLowerCase().includes(q) ||
        v.documents.some(d => 
          (d.title || '').toLowerCase().includes(q) ||
          (d.original_name || '').toLowerCase().includes(q) ||
          (d.document_category || '').toLowerCase().includes(q)
        )
      );
    }

    if (projectFilter) {
      result = result.filter(v => v.project_id === parseInt(projectFilter));
    }

    if (categoryFilter) {
      result = result.filter(v => 
        v.documents.some(d => d.document_category === categoryFilter)
      );
    }

    if (statusFilter) {
      result = result.filter(v => 
        v.documents.some(d => getDocExpiryStatus(d.expiry_date).status === statusFilter.toLowerCase())
      );
    }

    if (expiryMonthFilter) {
      const monthIdx = parseInt(expiryMonthFilter) - 1; // 1-indexed to 0-indexed
      result = result.filter(v => 
        v.documents.some(d => {
          if (!d.expiry_date) return false;
          return new Date(d.expiry_date).getMonth() === monthIdx;
        })
      );
    }

    return result;
  }, [vehiclesList, search, projectFilter, categoryFilter, statusFilter, expiryMonthFilter]);

  // Stats calculation for opened vehicle folder's documents
  const folderStats = useMemo(() => {
    if (!activeVehicle) return { total: 0, active: 0, expiring: 0, expired: 0 };
    let total = activeVehicle.documents.length;
    let active = 0;
    let expiring = 0;
    let expired = 0;

    activeVehicle.documents.forEach(d => {
      const status = getDocExpiryStatus(d.expiry_date).status;
      if (status === 'expired') expired++;
      else if (status === 'expiring') expiring++;
      else active++;
    });

    return { total, active, expiring, expired };
  }, [activeVehicle]);

  // Document groups scan
  const folderGroupedDocs = useMemo(() => {
    if (!activeVehicle) return [];
    return DOCUMENT_GROUPS.map(group => {
      const docs = activeVehicle.documents.filter(d => group.categories.includes(d.document_category));
      return {
        ...group,
        docs
      };
    });
  }, [activeVehicle]);

  // View PDF / image inline in a new tab
  const handleView = async (doc) => {
    try {
      await documentsAPI.checkFile(doc.id);
      const token = localStorage.getItem('token');
      const viewUrl = `${import.meta.env.VITE_API_URL || '/api'}/documents/view/${doc.id}?token=${token}`;
      window.open(viewUrl, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.message || 'File not found. Please upload the document again.');
    }
  };

  // Download document
  const handleDownload = async (doc) => {
    try {
      await documentsAPI.checkFile(doc.id);
      const token = localStorage.getItem('token');
      const downloadUrl = `${import.meta.env.VITE_API_URL || '/api'}/documents/download/${doc.id}?token=${token}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', doc.original_name || doc.file_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error(err.response?.data?.message || 'File not found. Please upload the document again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      
      {/* -------------------- MAIN DASHBOARD FOLDER GRID -------------------- */}
      {!activeVehicle ? (
        <>
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiFolder className="text-indigo-600 w-7 h-7" />
                Vehicle Documents
              </h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">Organized vehicle documents log files (view and download credentials)</p>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Folders</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalVehicles}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                  <FiTruck className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Documents</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalDocuments}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                  <FiFileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Expiring Soon</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.expiring30}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                  <FiAlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Expired Documents</p>
                  <p className="text-3xl font-extrabold text-red-600 mt-1">{stats.expired}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by vehicle plate, name, or doc name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium" />
              </div>
              
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all text-sm bg-white font-medium">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all text-sm bg-white font-medium">
                <option value="">All Document Types</option>
                {DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all text-sm bg-white font-medium">
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3 text-xs">
              <span className="font-semibold text-gray-400 mr-2">Filter Expiry Month:</span>
              
              <select value={expiryMonthFilter} onChange={(e) => setExpiryMonthFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 outline-none bg-white text-gray-600 font-semibold text-xs transition-all">
                <option value="">Select Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>

              {(search || projectFilter || categoryFilter || statusFilter || expiryMonthFilter) && (
                <button onClick={() => {
                  setSearch('');
                  setProjectFilter('');
                  setCategoryFilter('');
                  setStatusFilter('');
                  setExpiryMonthFilter('');
                }}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-all flex items-center gap-1">
                  <FiX className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Grid Loading State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 h-48 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-3 bg-gray-200 rounded w-1/3" /></div>
                  </div>
                  <div className="h-12 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
              <FiAlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
              <p className="text-amber-700 font-semibold">{error}</p>
              <button onClick={fetchDocs} className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all"><FiRefreshCw /> Retry</button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center max-w-md mx-auto shadow-sm">
              <FiFolder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No Vehicle Folders Found</h3>
              <p className="text-gray-400 text-sm">No folders found match the selected filter criteria.</p>
            </div>
          ) : (
            /* Vehicle Folders Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => {
                const expiryStatus = getVehicleExpiryStatus(vehicle.documents);
                const daysFormatted = new Date(vehicle.last_updated).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div key={vehicle.vehicle_number} 
                    className={`bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group border-gray-200 ${
                      expiryStatus.status === 'expired' ? 'hover:border-red-400' : expiryStatus.status === 'expiring' ? 'hover:border-amber-400' : 'hover:border-blue-400'
                    }`}>
                    
                    <div className={`absolute top-0 left-0 right-0 h-[5px] ${
                      expiryStatus.status === 'expired' ? 'bg-red-500' : expiryStatus.status === 'expiring' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />

                    <div className="p-5 space-y-4">
                      {/* Icon and Badge */}
                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                          expiryStatus.status === 'expired' ? 'bg-red-50 text-red-500' : expiryStatus.status === 'expiring' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                        }`}>
                          📁
                        </div>
                        <span className="text-xs bg-gray-100 font-bold px-2.5 py-1 rounded-full text-gray-500">
                          {vehicle.documents.length} {vehicle.documents.length === 1 ? 'Doc' : 'Docs'}
                        </span>
                      </div>

                      {/* Monospace plate identifier */}
                      <div>
                        <h3 className="font-mono text-lg font-black text-gray-900 tracking-wide uppercase flex items-center gap-1.5 text-ellipsis overflow-hidden">
                          {vehicle.vehicle_number}
                        </h3>
                        <p className="text-xs text-gray-500 font-bold mt-0.5">{vehicle.vehicle_model}</p>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{vehicle.vehicle_type}</p>
                      </div>

                      {/* Project and Date details */}
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3 text-gray-500 font-semibold">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Project</span>
                          <span className="font-semibold text-gray-700 truncate block">
                            {vehicle.project_name || 'General / No Project'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Last Updated</span>
                          <span className="font-semibold text-gray-700 block">{daysFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-between items-center">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${expiryStatus.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${expiryStatus.dot} animate-pulse`} />
                        {expiryStatus.text}
                      </div>

                      <button onClick={() => setActiveVehicle(vehicle)}
                        className="py-1.5 px-4 bg-white border border-gray-200 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-gray-100 rounded-xl transition-all shadow-sm">
                        Open Folder
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* -------------------- USER DETAILED FOLDER VIEW -------------------- */
        <div>
          {/* Breadcrumbs Navigation */}
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 font-semibold">
            <button onClick={() => setActiveVehicle(null)} className="hover:text-blue-600 flex items-center gap-1">
              <FiArrowLeft className="w-3.5 h-3.5" /> Folders
            </button>
            <span>/</span>
            <span className="text-gray-800 font-bold uppercase font-mono">{activeVehicle.vehicle_number}</span>
          </div>

          {/* Folder Details Box */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-blue-600" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center font-bold text-2xl border border-blue-100 text-blue-600">
                🚚
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-mono font-black text-gray-900 uppercase leading-none">{activeVehicle.vehicle_number}</h2>
                  <span className="px-2 py-0.5 rounded-lg border bg-gray-50 text-[10px] text-gray-500 font-bold uppercase">{activeVehicle.vehicle_type}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-600 mt-1">{activeVehicle.vehicle_model}</h3>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <span className="font-bold text-gray-500">Project:</span> {activeVehicle.project_name || 'No Project'}
                </p>
              </div>
            </div>

            <button onClick={() => setActiveVehicle(null)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm self-start md:self-center">
              <FiArrowLeft /> Back to Folders
            </button>
          </div>

          {/* 1. Vehicle Information Card (Exactly like Equipment details) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiTruck className="w-4 h-4 text-blue-600" /> Vehicle Information
            </h3>
            
            {loadingVehicleInfo ? (
              <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Vehicle Name', value: vehicleInfo?.name || activeVehicle.vehicle_model || '—' },
                  { label: 'Company', value: vehicleInfo?.company_name || '—' },
                  { label: 'Brand / Model', value: vehicleInfo?.brand && vehicleInfo?.model ? `${vehicleInfo.brand} ${vehicleInfo.model}` : vehicleInfo?.brand || vehicleInfo?.model || '—' },
                  { label: 'Vehicle Number Plate', value: activeVehicle.vehicle_number },
                  { label: 'Year', value: vehicleInfo?.year || '—' },
                  { label: 'Fuel Type', value: vehicleInfo?.fuel_type || '—' },
                  { label: 'Engine Number', value: vehicleInfo?.engine_number || '—' },
                  { label: 'Chassis Number', value: vehicleInfo?.chassis_number || '—' },
                  { label: 'Assigned Project', value: vehicleInfo?.project_name || activeVehicle.project_name || 'Not Assigned' },
                  { label: 'Current Driver / Operator', value: vehicleInfo?.operator_name || 'Not Assigned' },
                  { label: 'RC Status', value: vehicleInfo?.status?.replace(/_/g, ' ') || '—', isStatus: true },
                  { label: 'Insurance Expiry', value: vehicleInfo?.insurance_expiry ? new Date(vehicleInfo.insurance_expiry).toLocaleDateString('en-IN') : '—' },
                  { label: 'Fitness Expiry', value: vehicleInfo?.fitness_certificate ? new Date(vehicleInfo.fitness_certificate).toLocaleDateString('en-IN') : '—' },
                  { label: 'Pollution Expiry', value: vehicleInfo?.pollution_certificate ? new Date(vehicleInfo.pollution_certificate).toLocaleDateString('en-IN') : '—' },
                ].map(({ label, value, isStatus }) => (
                  <div key={label} className="space-y-1 border-b border-gray-50 pb-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{label}</p>
                    {isStatus ? (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_STYLES[value?.toLowerCase()?.replace(/ /g, '_')] || 'bg-gray-100 text-gray-500'}`}>
                        {value}
                      </span>
                    ) : (
                      <p className="font-semibold text-gray-800 text-sm truncate">{value}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Document statistics row inside folder */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500" />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Documents</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{folderStats.total}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-green-500" />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Documents</span>
              <p className="text-2xl font-black text-green-700 mt-1">{folderStats.active}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Expiring Soon</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{folderStats.expiring}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500" />
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Expired Documents</span>
              <p className="text-2xl font-black text-red-600 mt-1">{folderStats.expired}</p>
            </div>
          </div>

          {/* 3. Grouped Documents Section */}
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FiFile className="w-4 h-4 text-indigo-600" /> Documents Catalog
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folderGroupedDocs.map((group) => {
              return (
                <div key={group.key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 hover:shadow transition-all min-h-[220px]">
                  
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        📂 {group.label}
                      </h4>
                      {group.docs.length > 0 ? (
                        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[10px] text-blue-600 font-bold rounded-lg uppercase">
                          {group.docs.length} File(s)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-red-50 border border-red-200 text-[10px] text-red-600 font-bold rounded-lg uppercase">
                          Missing
                        </span>
                      )}
                    </div>

                    {/* Files Listing */}
                    {group.docs.length > 0 ? (
                      <div className="space-y-3.5">
                        {group.docs.map(doc => {
                          const docExpiry = getDocExpiryStatus(doc.expiry_date);
                          const fileStyle = getFileIcon(doc.file_name, doc.file_type);
                          const uploadDate = new Date(doc.created_at || doc.updated_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short'
                          });
                          const fileSizeKB = doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—';
                          
                          return (
                            <div key={doc.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fileStyle.color}`}>
                                  {fileStyle.icon}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-gray-800 text-xs truncate" title={doc.title}>
                                    {doc.title}
                                  </h5>
                                  <div className="flex items-center gap-x-2 text-[9px] text-gray-400 font-bold mt-0.5 flex-wrap">
                                    <span>{uploadDate}</span>
                                    <span>•</span>
                                    <span>{fileSizeKB}</span>
                                    <span>•</span>
                                    <span className="truncate">{doc.uploaded_by_name || 'Admin'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${docExpiry.badge}`}>
                                  {docExpiry.label}
                                </span>
                                <button onClick={() => handleView(doc)}
                                  className="p-1 bg-white border border-gray-200 hover:bg-gray-100 rounded text-blue-600 transition-all shadow-sm" title="View">
                                  <FiEye className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDownload(doc)}
                                  className="p-1 bg-white border border-gray-200 hover:bg-gray-100 rounded text-gray-600 transition-all shadow-sm" title="Download">
                                  <FiDownload className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-gray-400 text-xs font-semibold flex flex-col items-center justify-center gap-1">
                        <FiAlertCircle className="w-5 h-5 text-gray-300" />
                        No document uploaded
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDocuments;
