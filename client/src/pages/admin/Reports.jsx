import { motion } from 'framer-motion';
import { FiBarChart2 } from 'react-icons/fi';

const AdminReports = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-purple-50 flex items-center justify-center">
          <FiBarChart2 className="w-10 h-10 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-500">Reports module is under development. Connect to the database to see real data.</p>
      </motion.div>
    </div>
  );
};

export default AdminReports;
