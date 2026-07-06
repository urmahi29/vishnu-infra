import { motion } from 'framer-motion';
import { FiCheckSquare } from 'react-icons/fi';

const UserTasks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-50 flex items-center justify-center">
          <FiCheckSquare className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Tasks</h1>
        <p className="text-gray-500">Tasks module is under development. Connect to the database to see real data.</p>
      </motion.div>
    </div>
  );
};

export default UserTasks;
