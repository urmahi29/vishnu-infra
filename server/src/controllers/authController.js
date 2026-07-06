const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');
const { generateCode } = require('../utils/helpers');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');

const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials and try again.'
      });
    }

    // Handle status restrictions
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your registration request is awaiting administrator approval.'
      });
    }

    if (user.status === 'rejected') {
      const reasonSuffix = user.rejection_reason ? ` Reason: ${user.rejection_reason}` : '';
      return res.status(403).json({
        success: false,
        message: `Your registration request has been rejected. Please contact the administrator.${reasonSuffix}`
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact the administrator.'
      });
    }

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    // Support Remember Me - 30 days if checked, otherwise use default expiry
    const tokenExpiry = rememberMe ? '30d' : config.jwt.expire;

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: tokenExpiry
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: tokenExpiry
      }
    });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, designation, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeId = generateCode('EMP');

    const result = await db.query(
      `INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) 
       VALUES (?, ?, ?, ?, 'user', ?, ?, ?, 'pending')`,
      [employeeId, name, email, hashedPassword, phone || null, designation || null, department || null]
    );

    const user = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const { password: _, ...userData } = user[0];

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending administrator approval.',
      data: { user: userData }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const users = await db.query(
      `SELECT id, employee_id, name, email, role, phone, designation, department, 
              avatar, address, status, last_login_at, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, designation, department, address } = req.body;

    await db.query(
      `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
       designation = COALESCE(?, designation), department = COALESCE(?, department),
       address = COALESCE(?, address) WHERE id = ?`,
      [name, phone, designation, department, address, req.user.id]
    );

    const user = await db.query(
      'SELECT id, employee_id, name, email, role, phone, designation, department, avatar, address, status FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user[0]
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const currentPassword = current_password || req.body.currentPassword;
    const newPassword = new_password || req.body.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password - generate reset token
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const users = await db.query('SELECT id, name, email, status FROM users WHERE email = ?', [email]);

    // Always return the same message regardless of whether email exists (prevents user enumeration)
    const responseMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (users.length > 0 && users[0].status === 'active') {
      const user = users[0];
      
      // Generate a password reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      if (config.nodeEnv === 'development') {
        console.log(`[DEV] Password reset token for ${user.email}: ${resetToken}`);
      }

      // Store reset request in audit log
      await db.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'password_reset_request', 'user', user.id, JSON.stringify({ email: user.email })]
      );
    }

    res.json({
      success: true,
      message: responseMessage
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password with token
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new one.'
      });
    }

    // Verify user is still active
    const users = await db.query('SELECT status FROM users WHERE id = ? AND email = ?', [decoded.id, decoded.email]);
    if (users.length === 0 || users[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This account is no longer active. Please contact support.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ? AND email = ?', [hashedPassword, decoded.id, decoded.email]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [decoded.id, 'password_reset_completed', 'user', decoded.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// Firebase Login - Verify Firebase ID token and return app JWT
const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required'
      });
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Firebase token. Please sign in again.'
      });
    }

    const { email, name, picture, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase account must have an email address'
      });
    }

    // Look up user in MySQL by email
    let users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;
    let isNewUser = false;

    if (users.length === 0) {
      // Auto-create user in MySQL if they don't exist
      isNewUser = true;
      const employeeId = generateCode('EMP');
      const firebaseUid = uid || '';

      const result = await db.query(
        `INSERT INTO users (employee_id, name, email, password, role, phone, status, firebase_uid, avatar)
         VALUES (?, ?, ?, ?, 'user', ?, 'pending', ?, ?)`,
        [employeeId, name || email.split('@')[0], email, '', null, firebaseUid, picture || null]
      );

      user = (await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]))[0];
    } else {
      user = users[0];

      // Update firebase_uid and avatar if provided
      if (uid || picture) {
        await db.query(
          'UPDATE users SET firebase_uid = COALESCE(?, firebase_uid), avatar = COALESCE(?, avatar), last_login_at = NOW() WHERE id = ?',
          [uid || null, picture || null, user.id]
        );
      } else {
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
      }

      // Refresh user data
      user = (await db.query('SELECT * FROM users WHERE id = ?', [user.id]))[0];
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your registration request is awaiting administrator approval.'
      });
    }

    if (user.status === 'rejected') {
      const reasonSuffix = user.rejection_reason ? ` Reason: ${user.rejection_reason}` : '';
      return res.status(403).json({
        success: false,
        message: `Your registration request has been rejected. Please contact the administrator.${reasonSuffix}`
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate app JWT
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expire
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: isNewUser ? 'Account created and logged in successfully' : 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
        isNewUser
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  firebaseLogin,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
