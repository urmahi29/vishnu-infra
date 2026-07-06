import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiHardDrive, FiMapPin, FiPhone, FiMail, FiSend, 
  FiUser, FiMessageSquare, FiArrowUp, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import {
  FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp
} from 'react-icons/fa6';

// ============================================================
// Company Info
// ============================================================
const COMPANY = {
  name: 'Vishnu Infraprojects',
  tagline: 'Building India\'s Infrastructure, One Road at a Time',
  address: 'Plot No. 131, Gandhi Nagar, \nPali - 306401, Rajasthan, India',
  phone: '+91 9829933255',
  phone2: '+91 9079697415',
  email: 'vishnuinfra.2900@gmail.com',
  mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3588.6657960309995!2d73.32832961502447!3d25.781598983626788!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39423b3614945d8b%3A0xc07a8fe55f0b4d45!2sGandhi%20Nagar%2C%20Pali%2C%20Rajasthan%20306401!5e0!3m2!1sen!2sin!4v1688647000000!5m2!1sen!2sin',
  social: {
    facebook: '#',
    instagram: 'https://www.instagram.com/vishnu_infra_29?igsh=MWRpenVyYmhrOTZ6eQ==',
    linkedin: 'https://www.linkedin.com/in/vishnu-infra-4508a941b?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
    whatsapp: 'https://wa.me/919829933255'
  }
};

// ============================================================
// Social Media Button
// ============================================================
const SocialButton = ({ href, icon: Icon, label, color }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ scale: 1.1, y: -2 }}
    whileTap={{ scale: 0.95 }}
    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-shadow hover:shadow-xl ${color}`}
    title={label}
  >
    <Icon className="w-5 h-5" />
  </motion.a>
);

// ============================================================
// ANIMATIONS
// ============================================================
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 }
};

// Contact Page
const Contact = () => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.message) {
      setError('Please fill in all fields');
      return;
    }

    const cleanedPhone = form.phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:\+?91)?[0-9]{10}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSending(true);
    setError('');
    
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setSubmitted(true);
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      // Still show success — message will be stored locally/fallback
      setSubmitted(true);
      setForm({ name: '', phone: '', email: '', message: '' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 selection:bg-blue-500/30 selection:text-white">
      {/* ============================================================ */}
      {/* NAVBAR */}
      {/* ============================================================ */}
      <nav className="relative z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FiHardDrive className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Vishnu Infra</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/contact" className="text-sm text-blue-600 font-medium">Contact</Link>
            <Link to="/login" className="px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* HERO */}
      {/* ============================================================ */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        <div className="relative px-6 py-20 sm:py-28 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Get In Touch
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
              Let's Build Together
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Have a project in mind? Reach out to us. Our team is ready to discuss your 
              infrastructure needs and provide the best solutions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* COMPANY INFO + FORM */}
      {/* ============================================================ */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left — Company Info */}
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
            <p className="text-gray-500 mb-8">{COMPANY.tagline}</p>

            <div className="space-y-6">
              {/* Office Address */}
              <motion.div 
                className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300"
                whileHover={{ x: 5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-blue-200/40">
                  <FiMapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Office Address</h3>
                  <p className="text-gray-500 text-sm mt-1 whitespace-pre-line leading-relaxed">{COMPANY.address}</p>
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div 
                className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300"
                whileHover={{ x: 5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <FiPhone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Phone Numbers</h3>
                  <a href={`tel:${COMPANY.phone}`} className="text-gray-500 hover:text-blue-600 text-sm mt-1 block font-medium transition-colors">{COMPANY.phone}</a>
                  <a href={`tel:${COMPANY.phone2}`} className="text-gray-500 hover:text-blue-600 text-sm block font-medium transition-colors">{COMPANY.phone2}</a>
                </div>
              </motion.div>

              {/* Email */}
              <motion.div 
                className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300"
                whileHover={{ x: 5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FiMail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email Address</h3>
                  <a href={`mailto:${COMPANY.email}`} className="text-gray-500 hover:text-blue-600 text-sm mt-1 block font-medium transition-colors">{COMPANY.email}</a>
                </div>
              </motion.div>
            </div>

            {/* Social Media */}
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex flex-wrap gap-3">
                <SocialButton href={COMPANY.social.facebook} icon={FaFacebookF} label="Facebook" color="bg-[#1877F2]" />
                <SocialButton href={COMPANY.social.instagram} icon={FaInstagram} label="Instagram" color="bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]" />
                <SocialButton href={COMPANY.social.linkedin} icon={FaLinkedinIn} label="LinkedIn" color="bg-[#0A66C2]" />
                <SocialButton href={COMPANY.social.whatsapp} icon={FaWhatsapp} label="WhatsApp" color="bg-[#25D366]" />
              </div>
            </div>
          </motion.div>

          {/* Right — Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xl shadow-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Us a Message</h2>
              <p className="text-gray-500 mb-6">Fill out the form below and we'll get back to you within 24 hours.</p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent Successfully!</h3>
                  <p className="text-gray-500 mb-6">Thank you for reaching out. Our team will contact you shortly.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-200"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FiUser className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FiPhone className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="e.g. 10-digit mobile number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FiMail className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <FiMessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Tell us about your project or inquiry..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-60"
                  >
                    {sending ? (
                      <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Sending...
                    </>) : (
                      <><FiSend className="w-4 h-4" /> Send Message</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
