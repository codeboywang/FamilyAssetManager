import { useEffect, useState } from 'react';
import React from 'react';
import { Plus, Trash2, Wallet, Building2, Car, CreditCard, PiggyBank, TrendingUp, Shield, ArrowDownLeft, Landmark, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const iconMap: Record<string, any> = {
  'wallet': Wallet,
  'home': Building2,
  'car': Car,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'shield': Shield,
  'arrow-down-left': ArrowDownLeft,
  'landmark': Landmark,
  'alert-circle': PiggyBank // Fallback
};

export function Assets() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    member_id: '',
    category_id: '',
    currency: 'CNY',
    notes: '',
    initialAmount: '',
    credit_card_billing_day: '',
    loan_interest_rate: '',
    loan_term_months: '',
    loan_start_date: '',
    repayment_day: '',
    repayment_method: '',
    is_active: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [accRes, memRes, catRes] = await Promise.all([
      fetch('/api/accounts'),
      fetch('/api/members'),
      fetch('/api/categories')
    ]);
    setAccounts(await accRes.json());
    setMembers(await memRes.json());
    setCategories(await catRes.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      await fetch(`/api/accounts/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } else {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      name: '', member_id: '', category_id: '', currency: 'CNY', notes: '', initialAmount: '',
      credit_card_billing_day: '', loan_interest_rate: '', loan_term_months: '', loan_start_date: '',
      repayment_day: '', repayment_method: '', is_active: 1
    });
    fetchData();
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      member_id: account.member_id,
      category_id: account.category_id,
      currency: account.currency,
      notes: account.notes || '',
      initialAmount: '', // Don't edit initial amount
      credit_card_billing_day: account.credit_card_billing_day || '',
      loan_interest_rate: account.loan_interest_rate || '',
      loan_term_months: account.loan_term_months || '',
      loan_start_date: account.loan_start_date || '',
      repayment_day: account.repayment_day || '',
      repayment_method: account.repayment_method || '',
      is_active: account.is_active !== undefined ? account.is_active : 1
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    await fetch(`/api/accounts/${deleteConfirmId}`, { method: 'DELETE' });
    setDeleteConfirmId(null);
    fetchData();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ 
      name: '', member_id: '', category_id: '', currency: 'CNY', notes: '', initialAmount: '',
      credit_card_billing_day: '', loan_interest_rate: '', loan_term_months: '', loan_start_date: '',
      repayment_day: '', repayment_method: '', is_active: 1
    });
    setIsModalOpen(true);
  };

  // Helper to check category type
  const selectedCategory = categories.find(c => c.id == formData.category_id);
  const isCreditCard = selectedCategory?.icon === 'credit-card'; // Heuristic based on icon or name
  const isLoan = selectedCategory?.type === 'LIABILITY' && selectedCategory?.icon !== 'credit-card'; // Broad check for loans

  // Group accounts by Member
  const groupedAccounts = members.map(member => ({
    ...member,
    accounts: accounts.filter(a => a.member_id === member.id)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('assets.title')}</h2>
          <p className="text-gray-500">{t('assets.subtitle')}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={18} /> {t('assets.addAccount')}
        </button>
      </div>

      {groupedAccounts.map(member => (
        <div key={member.id} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 px-1">{member.name}'s {t('common.assets')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {member.accounts.length === 0 && (
              <div className="col-span-full p-4 text-sm text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                {t('assets.noAccounts')}
              </div>
            )}
            {member.accounts.map((account: any) => {
              const Icon = iconMap[account.category_icon] || Wallet;
              const isInactive = account.is_active === 0;
              return (
                <div key={account.id} className={cn(
                  "bg-white p-5 rounded-xl shadow-sm border border-gray-100 group relative",
                  isInactive && "opacity-60 grayscale"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        account.category_type === 'ASSET' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          {account.name}
                          {isInactive && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">{t('assets.inactive') || 'Inactive'}</span>}
                        </h4>
                        <p className="text-xs text-gray-500">{t(`categories.${account.category_name}`, { defaultValue: account.category_name }) as string}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(account)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(account.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {account.notes && (
                    <p className="mt-3 text-xs text-gray-400 line-clamp-2">{account.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('assets.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingId ? t('assets.editAccount') : t('assets.addAccount')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.accountName')}</label>
                <input 
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t('assets.accountPlaceholder')}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.initialAmount')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="0.00"
                      value={formData.initialAmount}
                      onChange={e => setFormData({...formData, initialAmount: e.target.value})}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.owner')}</label>
                  <select 
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={formData.member_id}
                    onChange={e => setFormData({...formData, member_id: e.target.value})}
                  >
                    <option value="">{t('common.select')}</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.category')}</label>
                  <select 
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={formData.category_id}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">{t('common.select')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {t(`categories.${c.name}`, { defaultValue: c.name }) as string}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.currency') || 'Currency'}</label>
                <select 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="CNY">CNY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="HKD">HKD (HK$)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              {/* Conditional Fields for Credit Cards */}
              {isCreditCard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.billingDay')}</label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. 25"
                      value={formData.credit_card_billing_day}
                      onChange={e => setFormData({...formData, credit_card_billing_day: e.target.value})}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Day of month</span>
                  </div>
                </div>
              )}

              {/* Conditional Fields for Loans */}
              {isLoan && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.interestRate')}</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.01"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="4.5"
                          value={formData.loan_interest_rate}
                          onChange={e => setFormData({...formData, loan_interest_rate: e.target.value})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.loanTerm')}</label>
                      <div className="relative">
                        <input 
                          type="number"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="360"
                          value={formData.loan_term_months}
                          onChange={e => setFormData({...formData, loan_term_months: e.target.value})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Months</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.loanStartDate')}</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.loan_start_date}
                        onChange={e => setFormData({...formData, loan_start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.repaymentDay')}</label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="1"
                          max="31"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. 10"
                          value={formData.repayment_day}
                          onChange={e => setFormData({...formData, repayment_day: e.target.value})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Day</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.repaymentMethod')}</label>
                    <select 
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={formData.repayment_method}
                      onChange={e => setFormData({...formData, repayment_method: e.target.value})}
                    >
                      <option value="">{t('common.select')}</option>
                      <option value="equal_principal">{t('assets.methods.equalPrincipal')}</option>
                      <option value="equal_installment">{t('assets.methods.equalInstallment')}</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('assets.notes')}</label>
                <textarea 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              {editingId && (
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    {t('assets.isActive') || 'Active Account'}
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  {editingId ? t('common.save') : t('assets.createAccount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
