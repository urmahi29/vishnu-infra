import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import { 
  FiUser, FiMail, FiPhone, FiSave, FiKey, FiAlertCircle, FiCheckCircle,
  FiCalendar, FiShield
} from 'react-icons/fi';

const Profile = () => {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', designation: '', department: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    authAPI.getProfile().then(res => {
      if (res.data?.data) {
        const u = res.data.data;
        setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', designation: u.designation || '', department: u.department || '' });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await authAPI.updateProfile(profile);
      setMsg('Profile updated successfully');
    } catch (err) {
      setMsg(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassMsg('');
    if (passwords.new_password !== passwords.confirm_password) { setPassError('Passwords do not match'); return; }
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your personal information and security settings</p>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
            {profile.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.name || 'User'}</h2>
            <p className="text-gray-500">{profile.designation || 'No designation'} · {profile.department || 'No department'}</p>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'profile', label: 'Edit Profile', icon: FiUser },
          { id: 'password', label: 'Change Password', icon: FiKey },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="max-w-lg space-y-4">
            {msg && (
              <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${msg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.includes('success') ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertCircle className="w-4 h-4" />}
                {msg}
              </div>
            )}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation</label><input type="text" value={profile.designation} onChange={(e) => setProfile(p => ({ ...p, designation: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" value={profile.department} onChange={(e) => setProfile(p => ({ ...p, department: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" /></div>
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200">
              {saving ? 'Saving...' : <><FiSave className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="max-w-lg space-y-4">
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
      </div>
    </div>
  );
};

export default Profile;
