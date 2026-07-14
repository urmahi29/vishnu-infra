import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="user" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className={`transition-all duration-300 ml-0 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-20'}`}>
        <Navbar role="user" onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="px-0 py-4 sm:p-6 mt-16">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
