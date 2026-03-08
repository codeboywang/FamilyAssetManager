import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Layers, Plus, Trash2, Download, Upload, Shield, Lock, FileArchive, Database, Info, Gift } from 'lucide-react';
import JSZip from 'jszip';

async function encryptData(data: string, password: string): Promise<{ encrypted: ArrayBuffer, iv: Uint8Array, salt: Uint8Array }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(data));
  return { encrypted, iv, salt };
}

async function decryptData(encrypted: ArrayBuffer, password: string, iv: Uint8Array, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

export function Settings({ currentUser }: { currentUser: any }) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('ASSET');
  
  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Import/Export State
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showMockDataConfirm, setShowMockDataConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '简体中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'ja', name: '日本語' },
  ];

  const fetchCategories = () => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;

    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName, type: newCategoryType }),
    });
    setNewCategoryName('');
    fetchCategories();
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setNotification({ message: t('settings.cannotDeleteCategory'), type: 'error' });
    } else {
      fetchCategories();
    }
  };

  const handleExportClick = () => {
    setShowExportPasswordModal(true);
  };

  const performExport = async () => {
    if (!exportPassword) {
      setNotification({ message: t('settings.passwordRequired'), type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      const jsonString = JSON.stringify(data, null, 2);

      const { encrypted, iv, salt } = await encryptData(jsonString, exportPassword);
      const zip = new JSZip();
      zip.file('data.enc', encrypted);
      zip.file('meta.json', JSON.stringify({ 
        iv: Array.from(iv), 
        salt: Array.from(salt),
        version: 1 
      }));
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family_assets_backup_secure_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportPasswordModal(false);
      setExportPassword('');
      setNotification({ message: t('settings.exportSuccess'), type: 'success' });
    } catch (e) {
      console.error(e);
      setNotification({ message: t('settings.exportFailed'), type: 'error' });
    }
  };

  const handleImportClick = () => {
    setShowImportWarning(true);
  };

  const confirmImport = () => {
    setShowImportWarning(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
      setPendingImportFile(file);
      setShowImportPasswordModal(true);
    } else {
      // Legacy JSON import
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          await uploadImportData(json);
        } catch (err) {
          console.error(err);
          setNotification({ message: t('settings.invalidFile'), type: 'error' });
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    e.target.value = '';
  };

  const performSecureImport = async () => {
    if (!pendingImportFile || !importPassword) return;

    try {
      const zip = await JSZip.loadAsync(pendingImportFile);
      const metaFile = zip.file('meta.json');
      const dataFile = zip.file('data.enc');

      if (!metaFile || !dataFile) {
        throw new Error('Invalid backup file format');
      }

      const meta = JSON.parse(await metaFile.async('string'));
      const encryptedData = await dataFile.async('arraybuffer');

      const jsonString = await decryptData(
        encryptedData, 
        importPassword, 
        new Uint8Array(meta.iv), 
        new Uint8Array(meta.salt)
      );
      
      const json = JSON.parse(jsonString);
      await uploadImportData(json);
      
      setShowImportPasswordModal(false);
      setImportPassword('');
      setPendingImportFile(null);
    } catch (err) {
      console.error(err);
      setNotification({ message: t('settings.decryptFailed') || 'Decryption failed. Wrong password?', type: 'error' });
    }
  };

  const uploadImportData = async (json: any) => {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    });
    if (res.ok) {
      setNotification({ message: t('settings.importSuccess'), type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setNotification({ message: t('settings.importFailed'), type: 'error' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(t('auth.passwordMismatch'));
      return;
    }

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        memberId: currentUser?.id,
        oldPassword, 
        newPassword 
      }),
    });

    if (res.ok) {
      setPasswordMessage(t('common.saved'));
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      const data = await res.json();
      setPasswordMessage(data.error);
    }
  };

  const handleGenerateMockData = async () => {
    setShowMockDataConfirm(true);
  };

  const confirmGenerateMockData = async () => {
    setShowMockDataConfirm(false);
    try {
      const res = await fetch('/api/mock', { method: 'POST' });
      if (res.ok) {
        setNotification({ message: t('settings.mockDataSuccess') || 'Mock data generated successfully', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setNotification({ message: t('settings.mockDataFailed') || 'Failed to generate mock data', type: 'error' });
      }
    } catch (e) {
      setNotification({ message: t('settings.mockDataFailed') || 'Failed to generate mock data', type: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Mock Data Confirmation Modal */}
      {showMockDataConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('settings.confirmMockData') || 'Are you sure you want to generate mock data? This will add fake records to your database.'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMockDataConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmGenerateMockData}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h2>
        <p className="text-gray-500">{t('settings.subtitle')}</p>
      </div>

      {/* README / Introduction */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform -rotate-3">
              <Info size={32} />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              {i18n.resolvedLanguage === 'zh' ? '欢迎使用 FamilyAsset 家庭资产管家' : 'Welcome to FamilyAsset Manager'}
            </h3>
            
            <div className="prose prose-sm md:prose-base text-gray-600 space-y-5">
              <p className="text-lg font-medium text-gray-800 leading-relaxed">
                {i18n.resolvedLanguage === 'zh' 
                  ? '这不仅仅是一个记账工具，更是您家庭财富的专属“私人银行”。我们致力于帮您理清每一笔资产、每一份权益、每一次人情往来。' 
                  : 'More than just a ledger, this is your family\'s exclusive "Private Bank". We help you track every asset, benefit, and social exchange with clarity.'}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-indigo-700 flex items-center gap-2 mb-2">
                    <Database size={18} />
                    {i18n.resolvedLanguage === 'zh' ? '全景资产视图' : 'Panoramic Asset View'}
                  </h4>
                  <p className="text-sm">
                    {i18n.resolvedLanguage === 'zh' 
                      ? '从银行存款、理财基金到房产车产，甚至负债贷款，一站式统管。净资产走势一目了然，让您的财富增长轨迹清晰可见。' 
                      : 'Manage everything from bank deposits and funds to real estate and loans. Track your net worth trends at a glance.'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-purple-700 flex items-center gap-2 mb-2">
                    <Gift size={18} />
                    {i18n.resolvedLanguage === 'zh' ? '隐形财富管理' : 'Hidden Wealth Management'}
                  </h4>
                  <p className="text-sm">
                    {i18n.resolvedLanguage === 'zh' 
                      ? '创新引入“权益”模块。买保险送的洗牙、商场积分兑换、终身免费保养...这些都是有价值的资产，不再让它们躺在角落过期！' 
                      : 'Innovative "Benefits" module. Track free dental cleanings, mall points, and lifetime maintenance. Don\'t let valuable perks expire!'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-emerald-700 flex items-center gap-2 mb-2">
                    <Layers size={18} />
                    {i18n.resolvedLanguage === 'zh' ? '人情往来备忘' : 'Social Exchange Ledger'}
                  </h4>
                  <p className="text-sm">
                    {i18n.resolvedLanguage === 'zh' 
                      ? '随礼、收礼、红白喜事...中国式家庭必备的人情账本。谁欠我，我欠谁，清清楚楚，再也不怕忘记回礼的尴尬。' 
                      : 'Track gifts given and received for weddings, birthdays, and events. Keep your social obligations clear and organized.'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-blue-700 flex items-center gap-2 mb-2">
                    <Shield size={18} />
                    {i18n.resolvedLanguage === 'zh' ? '绝对隐私安全' : 'Absolute Privacy'}
                  </h4>
                  <p className="text-sm">
                    {i18n.resolvedLanguage === 'zh' 
                      ? '您的数据只属于您。支持本地加密导出与导入，不依赖云端，彻底告别隐私泄露焦虑。' 
                      : 'Your data belongs to you. Supports local encrypted export and import. No cloud dependency, zero privacy anxiety.'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
                <strong>{i18n.resolvedLanguage === 'zh' ? '💡 快速上手提示：' : '💡 Quick Start Tip:'}</strong> 
                {i18n.resolvedLanguage === 'zh' 
                  ? ' 建议先在【成员】中添加家人，然后在【资产】中建立账户，最后在【记录更新】中录入初始金额。' 
                  : ' We recommend adding family members first, then setting up accounts in Assets, and finally entering initial balances in Record Update.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Globe size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('settings.language')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settings.selectLanguage')}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    i18n.resolvedLanguage === lang.code
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {lang.name}
                  {i18n.resolvedLanguage === lang.code && (
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Shield size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('settings.dataManagement')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settings.dataDesc') || 'Export your data securely or import from a backup.'}</p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                onClick={handleExportClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} />
                {t('settings.exportData')}
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload size={16} />
                {t('settings.importData')}
              </button>
              <button
                onClick={handleGenerateMockData}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <Database size={16} />
                {t('settings.generateMockData') || 'Generate Mock Data'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,.zip"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <Lock size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('settings.security')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('auth.changePassword')}</p>
            
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
              <input
                type="password"
                placeholder={t('auth.oldPassword')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder={t('auth.newPassword')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder={t('auth.confirmPassword')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
              />
              {passwordMessage && (
                <p className={`text-xs ${passwordMessage === t('common.saved') ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMessage}
                </p>
              )}
              <button 
                type="submit"
                disabled={!oldPassword || !newPassword}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('auth.changePassword')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <Layers size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('settings.manageCategories')}</h3>
            
            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.categoryName')}</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Crypto"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.categoryType')}</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newCategoryType}
                  onChange={e => setNewCategoryType(e.target.value)}
                >
                  <option value="ASSET">{t('settings.asset')}</option>
                  <option value="LIABILITY">{t('settings.liability')}</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={!newCategoryName}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={16} /> {t('common.add')}
              </button>
            </form>

            {/* Category List */}
            <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      cat.type === 'ASSET' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cat.type === 'ASSET' ? t('settings.asset') : t('settings.liability')}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {t(`categories.${cat.name}`, { defaultValue: cat.name }) as string}
                    </span>
                  </div>
                  {!cat.is_system && (
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Import Warning Modal */}
      {showImportWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('settings.importData')}</h3>
            <p className="text-gray-600 mb-6">
              {t('settings.importConfirm') || "This will overwrite all existing data. Are you sure you want to continue?"}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowImportWarning(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={confirmImport}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Password Modal */}
      {showExportPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-indigo-600">
              <Lock size={24} />
              <h3 className="text-lg font-bold text-gray-900">{t('settings.secureExport') || 'Secure Export'}</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              {t('settings.setExportPassword') || 'Set a password to encrypt your backup file. You will need this password to restore your data.'}
            </p>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
              placeholder={t('auth.password') || 'Password'}
              value={exportPassword}
              onChange={e => setExportPassword(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowExportPasswordModal(false); setExportPassword(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={performExport}
                disabled={!exportPassword}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {t('common.export') || 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Password Modal */}
      {showImportPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-4 text-indigo-600">
              <Lock size={24} />
              <h3 className="text-lg font-bold text-gray-900">{t('settings.decryptBackup') || 'Decrypt Backup'}</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              {t('settings.enterImportPassword') || 'Enter the password used to encrypt this backup.'}
            </p>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
              placeholder={t('auth.password') || 'Password'}
              value={importPassword}
              onChange={e => setImportPassword(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowImportPasswordModal(false); setImportPassword(''); setPendingImportFile(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={performSecureImport}
                disabled={!importPassword}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {t('common.decrypt') || 'Decrypt & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
