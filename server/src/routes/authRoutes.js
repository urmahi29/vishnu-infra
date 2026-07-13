const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/firebase-login', authController.firebaseLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

// Temporary Recovery Routes - Will be deleted after successful login
router.get('/temp-list-users', async (req, res, next) => {
  try {
    const db = require('../config/db');
    const users = await db.query('SELECT id, email, role, status FROM users');
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

router.post('/temp-reset-password', async (req, res, next) => {
  try {
    const db = require('../config/db');
    const bcrypt = require('bcryptjs');
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query('UPDATE users SET password = ?, status = "active" WHERE email = ?', [hashedPassword, email]);
    res.json({ success: true, message: `Password reset successfully for ${email}`, affectedRows: result.affectedRows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
