const generateCode = (prefix) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildUpdateFields = (fields, data) => {
  const updates = [];
  const values = [];
  
  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  return { updates, values };
};

const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

const formatDateTime = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().replace('T', ' ').substring(0, 19);
};

module.exports = {
  generateCode,
  parsePagination,
  buildUpdateFields,
  calculateProgress,
  formatCurrency,
  formatDate,
  formatDateTime
};
