import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiAlertTriangle } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="min-h-screen construction-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center"
        >
          <FiAlertTriangle className="w-12 h-12 text-red-400" />
        </motion.div>
        <h1 className="text-7xl font-extrabold text-white mb-2">404</h1>
        <p className="text-xl text-gray-300 mb-2">Page Not Found</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
        >
          <FiHome className="w-4 h-4" />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
