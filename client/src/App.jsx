import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Loader from './components/common/Loader';
import AdminLayout from './components/layout/AdminLayout';
import UserLayout from './components/layout/UserLayout';

// Lazy load pages for better performance
const Landing = lazy(() => import('./pages/Landing'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProjects = lazy(() => import('./pages/admin/Projects'));
const AdminTasks = lazy(() => import('./pages/admin/Tasks'));
const AdminMaterials = lazy(() => import('./pages/admin/Materials'));
const AdminBudget = lazy(() => import('./pages/admin/Budget'));
const AdminWorkforce = lazy(() => import('./pages/admin/Workforce'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminDocuments = lazy(() => import('./pages/admin/Documents'));
const AdminSafety = lazy(() => import('./pages/admin/Safety'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminRegistrationRequests = lazy(() => import('./pages/admin/RegistrationRequests'));
const AdminFuel = lazy(() => import('./pages/admin/Fuel'));
const AdminStaffExpenses = lazy(() => import('./pages/admin/StaffExpenses'));
const AdminTrips = lazy(() => import('./pages/admin/Trips'));

// User Pages
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const UserProjects = lazy(() => import('./pages/user/Projects'));
const UserTasks = lazy(() => import('./pages/user/Tasks'));
const UserProfile = lazy(() => import('./pages/user/Profile'));
const UserNotifications = lazy(() => import('./pages/user/Notifications'));
const UserDocuments = lazy(() => import('./pages/user/Documents'));

// Reused admin pages for user read-only access
const UserBudget = lazy(() => import('./pages/admin/Budget'));
const UserFuel = lazy(() => import('./pages/admin/Fuel'));
const UserStaffExpenses = lazy(() => import('./pages/admin/StaffExpenses'));
const UserTrips = lazy(() => import('./pages/admin/Trips'));
const UserWorkforce = lazy(() => import('./pages/admin/Workforce'));

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <Loader fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/user/dashboard" replace />;

  return children;
};

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader size="lg" />
  </div>
);

// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}>
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<AdminProjects />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="materials" element={<AdminMaterials />} />
            <Route path="budget" element={<AdminBudget />} />
            <Route path="workforce" element={<AdminWorkforce />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="safety" element={<AdminSafety />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="registration-requests" element={<AdminRegistrationRequests />} />
            <Route path="fuel" element={<AdminFuel />} />
            <Route path="staff-expenses" element={<AdminStaffExpenses />} />
            <Route path="trips" element={<AdminTrips />} />
          </Route>

          {/* User Routes */}
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/user/dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="projects" element={<UserProjects />} />
            <Route path="tasks" element={<Navigate to="/user/dashboard" replace />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="notifications" element={<Navigate to="/user/dashboard" replace />} />
            <Route path="documents" element={<UserDocuments />} />
            <Route path="budget" element={<UserBudget />} />
            <Route path="fuel" element={<UserFuel />} />
            <Route path="staff-expenses" element={<UserStaffExpenses />} />
            <Route path="trips" element={<UserTrips />} />
            <Route path="workforce" element={<UserWorkforce />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatedRoutes />
    </Suspense>
  );
};

export default App;
