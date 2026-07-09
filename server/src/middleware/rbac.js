const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.'
      });
    }

    // Check if the route is for user management or registration requests
    const isUserManagement = req.baseUrl === '/api/users' || req.originalUrl.startsWith('/api/users');
    
    let roles = [...allowedRoles];
    if (roles.includes('admin') && !isUserManagement) {
      roles.push('user');
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = { authorize };
