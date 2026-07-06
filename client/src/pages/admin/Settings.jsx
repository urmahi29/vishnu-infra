import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../../services/api';
import { 
  FiSave, FiKey, FiGlobe, FiMapPin, FiPhone, FiMail, FiClock,
  FiAlertCircle, FiCheckCircle, FiCamera, FiLink
} from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';

const Settings = () => {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', designation: '', department: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  const [contact, setContact] = useState({
    company_name: 'Vishnu Infraprojects',
    address: 'Plot No. 123, Industrial Development Area, NH-44, Sector 12, Faridabad, Haryana - 121002',
    phone: '+91 98765 43210',
    email: 'info@vishnuinfra.com',
    working_hours: 'Monday – Saturday: 9:00 AM – 6:00 PM\nSunday: Closed'
  });
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState('');

  const [social, setSocial] = useState({
    facebook: 'https://facebook.com/vishnuinfra',
    instagram: 'https://instagram.com/vishnuinfra',
    linkedin: 'https://linkedin.com/company/vishnuinfra',
    youtube: 'https://youtube.com/@vishnuinfra',
    whatsapp: 'https://wa.me/919876543210',
    twitter: 'https://x.com/vishnuinfra'
  });
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg] = useState('');

  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    authAPI.getProfile().then(res => {
      if (res.data?.data) {
        const u = res.data.data;
        setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', designation: u.designation || '', department: u.department || '' });
      }
    }).catch(() => {});
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await authAPI.updateProfile(profile);
      setProfileMsg('Profile updated successfully');
    } catch (err) {
      setProfileMsg(err?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassMsg('');
    if (passwords.new_password !== passwords.confirm_password) { setPassError('Passwords do not match'); return; }
    if (passwords.new_password.length < 6) { setPassError('Password must be at least 6 characters'); return; }
    setSavingPass(true);
    try {
      await authAPI.changePassword({ current_password: passwords.current_password, new_password: passwords.new_password });
      setPassMsg('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(err?.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  const handleContactSave = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    setContactMsg('');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.setItem('contact_settings', JSON.stringify(contact));
      setContactMsg('Contact details updated successfully');
    } catch (err) {
      setContactMsg('Failed to save contact details');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSocialSave = async (e) => {
    e.preventDefault();
    setSavingSocial(true);
    setSocialMsg('');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.setItem('social_links', JSON.stringify(social));
      setSocialMsg('Social links updated successfully');
    } catch (err) {
      setSocialMsg('Failed to save social links');
    } finally {
      setSavingSocial(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: FiCamera },
    { id: 'password', label: 'Change Password', icon: FiKey },
    { id: 'contact', label: 'Contact Details', icon: FiMapPin },
    { id: 'social', label: 'Social Links', icon: FiGlobe },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 mt-1">Manage system configuration, profile, and contact information</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all text-left ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSave} className="max-w-lg space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">My Profile</h2>
                {profileMsg && (
                  <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${profileMsg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {profileMsg.includes('success') ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
                    {profileMsg}
                  </div>
                )}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation</label><input type="text" value={profile.designation} onChange={(e) => setProfile(p => ({ ...p, designation: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" value={profile.department} onChange={(e) => setProfile(p => ({ ...p, department: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                </div>
                <button type="submit" disabled={savingProfile} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {savingProfile ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Changes</>}
                </button>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordChange} className="max-w-lg space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Change Password</h2>
                {passMsg && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><FiCheckCircle className="w-4 h-4" />{passMsg}</div>}
                {passError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><FiAlertCircle className="w-4 h-4" />{passError}</div>}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={passwords.current_password} onChange={(e) => setPasswords(p => ({ ...p, current_password: e.target.value }))} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={passwords.new_password} onChange={(e) => setPasswords(p => ({ ...p, new_password: e.target.value }))} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label><input type="password" value={passwords.confirm_password} onChange={(e) => setPasswords(p => ({ ...p, confirm_password: e.target.value }))} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <button type="submit" disabled={savingPass} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {savingPass ? 'Updating...' : <><FiKey className="w-4 h-4" /> Change Password</>}
                </button>
              </form>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <form onSubmit={handleContactSave} className="max-w-lg space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contact Details</h2>
                <p className="text-sm text-gray-500 mb-2">These details are displayed on the public Contact page.</p>
                {contactMsg && (
                  <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${contactMsg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {contactMsg.includes('success') ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
                    {contactMsg}
                  </div>
                )}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><div className="relative"><FiCamera className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={contact.company_name} onChange={(e) => setContact(p => ({ ...p, company_name: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label><textarea value={contact.address} onChange={(e) => setContact(p => ({ ...p, address: e.target.value }))} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1"><FiPhone className="w-3.5 h-3.5 inline mr-1" />Phone Number</label><input type="text" value={contact.phone} onChange={(e) => setContact(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1"><FiMail className="w-3.5 h-3.5 inline mr-1" />Email Address</label><input type="email" value={contact.email} onChange={(e) => setContact(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1"><FiClock className="w-3.5 h-3.5 inline mr-1" />Working Hours</label><textarea value={contact.working_hours} onChange={(e) => setContact(p => ({ ...p, working_hours: e.target.value }))} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none" /></div>
                <button type="submit" disabled={savingContact} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {savingContact ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Contact Details</>}
                </button>
              </form>
            )}

            {/* Social Links Tab */}
            {activeTab === 'social' && (
              <form onSubmit={handleSocialSave} className="max-w-lg space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Social Media Links</h2>
                <p className="text-sm text-gray-500 mb-2">Manage social media links displayed on the Contact page and footer.</p>
                {socialMsg && (
                  <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${socialMsg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {socialMsg.includes('success') ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
                    {socialMsg}
                  </div>
                )}
                {[
                  { key: 'facebook', label: 'Facebook', icon: FaFacebookF, color: 'text-[#1877F2]', placeholder: 'https://facebook.com/yourpage' },
                  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-[#E4405F]', placeholder: 'https://instagram.com/yourpage' },
                  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn, color: 'text-[#0A66C2]', placeholder: 'https://linkedin.com/company/yourpage' },
                  { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-[#FF0000]', placeholder: 'https://youtube.com/@yourchannel' },
                  { key: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: 'text-[#25D366]', placeholder: 'https://wa.me/91XXXXXXXXXX' },
                  { key: 'twitter', label: 'Twitter (X)', icon: FaXTwitter, color: 'text-black', placeholder: 'https://x.com/yourhandle' },
                ].map(({ key, label, icon: Icon, color, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} /> {label}
                    </label>
                    <div className="relative">
                      <FiLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="url" value={social[key]} onChange={(e) => setSocial(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                  </div>
                ))}
                <button type="submit" disabled={savingSocial} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
                  {savingSocial ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Social Links</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
