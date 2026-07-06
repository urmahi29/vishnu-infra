import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler
);

// Shared options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 16,
        font: { family: 'Inter, sans-serif', size: 11 },
        color: '#64748b',
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { family: 'Inter, sans-serif', size: 12 },
      bodyFont: { family: 'Inter, sans-serif', size: 11 },
      padding: 12,
      cornerRadius: 8,
    }
  }
};

// Project Progress Doughnut Chart
export const ProjectProgressChart = ({ data = { planned: 0, inProgress: 0, completed: 0, onHold: 0 } }) => {
  const chartData = {
    labels: ['In Progress', 'Completed', 'Planned', 'On Hold'],
    datasets: [{
      data: [data.inProgress || 0, data.completed || 0, data.planned || 0, data.onHold || 0],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#94a3b8'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  };

  const total = (data.inProgress || 0) + (data.completed || 0) + (data.planned || 0) + (data.onHold || 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-5 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Project Progress</h3>
        <span className="text-xs text-gray-400">Total: {total}</span>
      </div>
      <div className="h-52 flex items-center justify-center">
        {total > 0 ? (
          <Doughnut data={chartData} options={{
            ...chartOptions,
            cutout: '70%',
            plugins: {
              ...chartOptions.plugins,
              legend: { ...chartOptions.plugins.legend, display: true }
            }
          }} />
        ) : (
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl text-gray-300">0</span>
            </div>
            <p className="text-sm">No project data yet</p>
            <p className="text-xs mt-1">Add projects to see progress</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {[
          { label: 'In Progress', color: 'bg-blue-500', value: data.inProgress || 0 },
          { label: 'Completed', color: 'bg-emerald-500', value: data.completed || 0 },
          { label: 'Planned', color: 'bg-amber-500', value: data.planned || 0 },
          { label: 'On Hold', color: 'bg-slate-400', value: data.onHold || 0 },
        ].map(item => (
          <div key={item.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs font-semibold text-gray-700">{item.value}</span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">{item.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Staff Count Bar Chart
export const StaffChart = ({ data = { permanent: 0, contract: 0, dailyWage: 0, intern: 0 } }) => {
  const chartData = {
    labels: ['Permanent', 'Contract', 'Daily Wage', 'Intern'],
    datasets: [{
      label: 'Staff Count',
      data: [data.permanent || 0, data.contract || 0, data.dailyWage || 0, data.intern || 0],
      backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'],
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const total = (data.permanent || 0) + (data.contract || 0) + (data.dailyWage || 0) + (data.intern || 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-xl p-5 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Staff Count</h3>
        <span className="text-xs text-gray-400">Total: {total}</span>
      </div>
      <div className="h-52">
        {total > 0 ? (
          <Bar data={chartData} options={{
            ...chartOptions,
            indexAxis: 'y',
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
            },
            plugins: { ...chartOptions.plugins, legend: { display: false } }
          }} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-sm">No workforce data yet</p>
              <p className="text-xs mt-1">Add workers to see staff count</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Vehicle Status Pie Chart
export const VehicleStatusChart = ({ data = { available: 0, inUse: 0, maintenance: 0, outOfService: 0 } }) => {
  const chartData = {
    labels: ['Available', 'In Use', 'Maintenance', 'Out of Service'],
    datasets: [{
      data: [data.available || 0, data.inUse || 0, data.maintenance || 0, data.outOfService || 0],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  };

  const total = (data.available || 0) + (data.inUse || 0) + (data.maintenance || 0) + (data.outOfService || 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-xl p-5 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Vehicle Status</h3>
        <span className="text-xs text-gray-400">Total: {total}</span>
      </div>
      <div className="h-52 flex items-center justify-center">
        {total > 0 ? (
          <Pie data={chartData} options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              legend: { ...chartOptions.plugins.legend, display: true }
            }
          }} />
        ) : (
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl text-gray-300">0</span>
            </div>
            <p className="text-sm">No vehicle data yet</p>
            <p className="text-xs mt-1">Add equipment to see status</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {[
          { label: 'Available', color: 'bg-emerald-500', value: data.available || 0 },
          { label: 'In Use', color: 'bg-blue-500', value: data.inUse || 0 },
          { label: 'Maintenance', color: 'bg-amber-500', value: data.maintenance || 0 },
          { label: 'Out of Svc', color: 'bg-red-500', value: data.outOfService || 0 },
        ].map(item => (
          <div key={item.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs font-semibold text-gray-700">{item.value}</span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">{item.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
