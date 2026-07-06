const db = require('../config/db');

const submitContact = async (req, res, next) => {
  try {
    const { name, phone, email, message } = req.body;

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Store inquiry in notifications table for admin visibility
    await db.query(
      `INSERT INTO notifications (title, message, type, category, created_at)
       VALUES (?, ?, 'info', 'system', NOW())`,
      [`New Contact Inquiry from ${name}`,
       `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message}`]
    );

    res.json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitContact };
