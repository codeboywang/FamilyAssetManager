import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Wallet, Users, ClipboardList, Settings, Gift, LogOut, Shield, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
}

export function Layout({ children, activeTab, onTabChange, onLogout }: LayoutProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
    { id: 'record', label: t('common.inventory') || 'Inventory', icon: ClipboardList },
    { id: 'assets', label: t('common.assets'), icon: Wallet },
    { id: 'benefits', label: t('common.benefits') || 'Benefits', icon: Award },
    { id: 'renqing', label: t('common.renqing') || 'Renqing', icon: Gift },
    { id: 'insurance', label: t('insurance.title') || 'Insurance', icon: Shield },
    { id: 'members', label: t('common.members'), icon: Users },
    { id: 'settings', label: t('common.settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="bg-white border-r border-gray-200 md:w-64 flex-shrink-0 hidden md:flex md:flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Wallet size={18} />
            </span>
            FamilyAsset
          </h1>
        </div>
        <div className="p-4 space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </div>
        {onLogout && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              {t('common.logout') || 'Logout'}
            </button>
          </div>
        )}
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40">
         <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Wallet size={18} />
            </span>
            FamilyAsset
          </h1>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600"
            >
              <LogOut size={20} />
            </button>
          )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex overflow-x-auto hide-scrollbar p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium min-w-[72px] flex-shrink-0 transition-colors",
              activeTab === item.id
                ? "text-indigo-600 bg-indigo-50"
                : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
