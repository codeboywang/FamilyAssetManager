import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, User, UserPlus, Key } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, member: any) => void;
}

interface Admin {
  id: number;
  name: string;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (!data.hasAdmin) {
        setIsSetup(true);
      } else {
        fetchAdmins();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/auth/admins');
      const data = await res.json();
      setAdmins(data);
      if (data.length > 0) {
        setSelectedAdmin(String(data[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedAdmin, password }),
      });
      const data = await res.json();

      if (data.success) {
        onLogin(data.token, data.member);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: setupName, password: setupPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSetup(false);
        fetchAdmins();
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-100">{t('common.loading') || 'Loading...'}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-emerald-100 p-4 rounded-full">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-stone-800 mb-2">
          {isSetup ? t('auth.adminSetupTitle') : t('auth.loginTitle')}
        </h1>
        <p className="text-center text-stone-500 mb-8">
          {isSetup ? (t('auth.setupDesc') || 'Create your first admin account') : (t('auth.loginDesc') || 'Please login to continue')}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {isSetup ? (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.adminName') || 'Admin Name'}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('auth.enterName') || 'Enter your name'}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('auth.createPassword') || 'Create a password'}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {t('auth.setupButton')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.selectUser') || 'Select User'}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                  required
                >
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('auth.enterPassword') || 'Enter password'}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl transition-colors"
            >
              {t('auth.loginButton')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
