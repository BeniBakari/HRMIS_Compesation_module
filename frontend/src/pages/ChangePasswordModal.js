import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// import api from '../services/api'; // your axios instance
import { X, KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordModal1() {
  const { user, requiresPasswordChange, clearPasswordChangeFlag } = useAuth();
  
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto open modal when backend requires password change
  useEffect(() => {
    if (requiresPasswordChange) {
      setError('');
      setSuccess('');
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
    }
  }, [requiresPasswordChange]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const toggleVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.new_password !== formData.confirm_password) {
      setError("Nenosiri mpya hazilingani");
      return;
    }
    if (formData.new_password.length < 8) {
      setError("Nenosiri lazima liwe na angalau herufi 8");
      return;
    }

    setLoading(true);

    try {
      // await api.post(`/api/auth/users/${user?.id}/change-password/`, {
      //   current_password: formData.current_password,
      //   new_password: formData.new_password,
      // });

      setSuccess("Nenosiri limebadilishwa kwa mafanikio!");

      // Clear flag and close modal after success
      setTimeout(() => {
        clearPasswordChangeFlag();
      }, 1500);

    } catch (err) {
      const msg = err.response?.data?.detail || 
                 err.response?.data?.current_password?.[0] ||
                 "Imeshindikana kubadilisha nenosiri";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!requiresPasswordChange || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1c236d] to-[#2d3a8c] p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <KeyRound size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Badilisha Nenosiri Lako</h2>
              <p className="text-white/80 mt-1">
                Nenosiri lako ni dhaifu au la kawaida.<br />
                Lazima ulibadilishe kabla ya kuendelea.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-6 flex items-center gap-3">
              <CheckCircle2 className="text-green-600" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Nenosiri la Sasa
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('current')}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Nenosiri Jipya
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('new')}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Thibitisha Nenosiri Jipya
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('confirm')}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1c236d] hover:bg-[#2d3a8c] text-white font-semibold py-4 rounded-2xl transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Inabadilisha...
                </>
              ) : (
                "Badilisha Nenosiri"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}