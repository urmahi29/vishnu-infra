const db = require('../config/db');
const { parsePagination } = require('../utils/helpers');

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { is_read, type } = req.query;

    let whereClause = ['(n.user_id = ? OR n.user_id IS NULL)'];
    let params = [req.user.id];

    if (is_read !== undefined) { whereClause.push('n.is_read = ?'); params.push(is_read === 'true' ? 1 : 0); }
    if (type) { whereClause.push('n.type = ?'); params.push(type); }

    const whereStr = 'WHERE ' + whereClause.join(' AND ');

    const [notifications, countResult] = await Promise.all([
      db.query(`SELECT * FROM notifications n ${whereStr} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) as total FROM notifications n ${whereStr}`, params)
    ]);

    // Get unread count
    const unreadResult = await db.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      data: notifications,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) },
      unread_count: unreadResult[0].unread_count
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const { user_id, title, message, type, category, reference_type, reference_id } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const result = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id || null, title, message, type || 'info', category || 'system', reference_type || null, reference_id || null]
    );

    res.status(201).json({ success: true, message: 'Notification created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    await db.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification
};
