import React, { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, FileText, Download, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Insurance() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletePaymentConfirmId, setDeletePaymentConfirmId] = useState<number | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [selectedPolicyForPayment, setSelectedPolicyForPayment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'health',
    company: '',
    premium_amount: '',
    premium_period: 'yearly',
    insured_member_id: '',
    beneficiary: '',
    start_date: '',
    end_date: '',
    renewal_date: '',
    benefits_desc: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    currency: 'CNY',
    payment_date: new Date().toISOString().split('T')[0],
    account_id: '',
    notes: ''
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPolicies();
    fetchMembers();
    fetchAccounts();
  }, []);

  const fetchPolicies = async () => {
    const res = await fetch('/api/insurance');
    const data = await res.json();
    setPolicies(data);
  };

  const fetchMembers = async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    setMembers(data);
  };

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value as string);
    });
    if (file) {
      data.append('policy_file', file);
    }

    const url = editingPolicy ? `/api/insurance/${editingPolicy.id}` : '/api/insurance';
    const method = editingPolicy ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      body: data,
    });

    setIsModalOpen(false);
    setEditingPolicy(null);
    setFile(null);
    setFormData({
      name: '', type: 'health', company: '', premium_amount: '', premium_period: 'yearly',
      insured_member_id: '', beneficiary: '', start_date: '', end_date: '', renewal_date: '', benefits_desc: ''
    });
    fetchPolicies();
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    await fetch(`/api/insurance/${deleteConfirmId}`, { method: 'DELETE' });
    setDeleteConfirmId(null);
    fetchPolicies();
  };

  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyForPayment) return;

    try {
      const url = editingPaymentId 
        ? `/api/insurance/payments/${editingPaymentId}`
        : `/api/insurance/${selectedPolicyForPayment.id}/payments`;
      const method = editingPaymentId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentFormData)
      });
      setIsPaymentModalOpen(false);
      setEditingPaymentId(null);
      fetchPolicies(); // Refresh to get updated payments
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    setDeletePaymentConfirmId(paymentId);
  };

  const confirmDeletePayment = async () => {
    if (!deletePaymentConfirmId) return;
    await fetch(`/api/insurance/payments/${deletePaymentConfirmId}`, { method: 'DELETE' });
    setDeletePaymentConfirmId(null);
    fetchPolicies();
  };

  const openEditModal = (policy: any) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      type: policy.type,
      company: policy.company || '',
      premium_amount: policy.premium_amount || '',
      premium_period: policy.premium_period || 'yearly',
      insured_member_id: policy.insured_member_id || '',
      beneficiary: policy.beneficiary || '',
      start_date: policy.start_date || '',
      end_date: policy.end_date || '',
      renewal_date: policy.renewal_date || '',
      benefits_desc: policy.benefits_desc || ''
    });
    setIsModalOpen(true);
  };

  const openPaymentModal = (policy: any, payment?: any) => {
    setSelectedPolicyForPayment(policy);
    if (payment) {
      setEditingPaymentId(payment.id);
      setPaymentFormData({
        amount: payment.amount.toString(),
        currency: payment.currency || 'CNY',
        payment_date: payment.payment_date,
        account_id: payment.payment_account_id?.toString() || '',
        notes: payment.notes || ''
      });
    } else {
      setEditingPaymentId(null);
      setPaymentFormData({
        amount: policy.premium_amount || '',
        currency: 'CNY',
        payment_date: new Date().toISOString().split('T')[0],
        account_id: '',
        notes: ''
      });
    }
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('common.confirmDelete')}</p>
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

      {/* Delete Payment Confirmation Modal */}
      {deletePaymentConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('common.confirmDelete')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletePaymentConfirmId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeletePayment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('insurance.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('insurance.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditingPolicy(null);
            setFormData({
              name: '', type: 'health', company: '', premium_amount: '', premium_period: 'yearly',
              insured_member_id: '', beneficiary: '', start_date: '', end_date: '', renewal_date: '', benefits_desc: ''
            });
            setFile(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          {t('insurance.addPolicy')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                  <p className="text-sm text-gray-500">{t(`insurance.types.${policy.type}`)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(policy)} className="text-gray-400 hover:text-indigo-600">
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleDelete(policy.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('insurance.company')}:</span>
                <span className="font-medium">{policy.company}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('insurance.insured')}:</span>
                <span className="font-medium">{policy.member_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('insurance.premium')}:</span>
                <span className="font-medium text-red-600">¥{policy.premium_amount} / {t(`insurance.periods.${policy.premium_period}`)}</span>
              </div>
              {policy.renewal_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('insurance.renewalDate')}:</span>
                  <span className="font-medium text-orange-600">{policy.renewal_date}</span>
                </div>
              )}
            </div>

            {policy.payments && policy.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('insurance.paymentHistory') || 'Payment History'}</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {policy.payments.map((payment: any) => (
                    <div key={payment.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                      <div>
                        <div className="font-medium text-gray-900">{payment.payment_date}</div>
                        <div className="text-gray-500">{payment.account_name || t('common.unknownAccount') || 'Unknown Account'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-red-600">
                          {payment.currency} {payment.amount}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => openPaymentModal(policy, payment)} className="p-1 text-gray-400 hover:text-indigo-600">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeletePayment(payment.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => openPaymentModal(policy)}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <CreditCard size={16} />
                {t('insurance.recordPayment') || 'Record Payment'}
              </button>
              {policy.policy_file_url && (
                <a href={policy.policy_file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                  <FileText size={16} />
                  {t('insurance.viewPdf')}
                </a>
              )}
            </div>
          </div>
        ))}
        {policies.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {t('insurance.noPolicies')}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPolicy ? t('insurance.editPolicy') : t('insurance.addPolicy')}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.name')}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.type')}</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="health">{t('insurance.types.health')}</option>
                    <option value="car">{t('insurance.types.car')}</option>
                    <option value="travel">{t('insurance.types.travel')}</option>
                    <option value="accident">{t('insurance.types.accident')}</option>
                    <option value="life">{t('insurance.types.life')}</option>
                    <option value="other">{t('insurance.types.other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.company')}</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.insured')}</label>
                  <select
                    value={formData.insured_member_id}
                    onChange={e => setFormData({...formData, insured_member_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">{t('common.select')}</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.premium')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium_amount}
                    onChange={e => setFormData({...formData, premium_amount: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.period')}</label>
                  <select
                    value={formData.premium_period}
                    onChange={e => setFormData({...formData, premium_period: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="yearly">{t('insurance.periods.yearly')}</option>
                    <option value="monthly">{t('insurance.periods.monthly')}</option>
                    <option value="one-time">{t('insurance.periods.one-time')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.startDate')}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {formData.premium_period !== 'one-time' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.renewalDate')}</label>
                    {formData.premium_period === 'yearly' ? (
                      <input
                        type="month"
                        value={formData.renewal_date}
                        onChange={e => setFormData({...formData, renewal_date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="1-31"
                          value={formData.renewal_date}
                          onChange={e => setFormData({...formData, renewal_date: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{t('common.day') || '日'}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.benefits')}</label>
                  <textarea
                    rows={3}
                    value={formData.benefits_desc}
                    onChange={e => setFormData({...formData, benefits_desc: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.uploadPdf')}</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {t('insurance.recordPayment') || 'Record Payment'} - {selectedPolicyForPayment?.name}
              </h3>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.amount') || 'Amount'}</label>
                <div className="flex gap-2">
                  <select
                    value={paymentFormData.currency}
                    onChange={e => setPaymentFormData({...paymentFormData, currency: e.target.value})}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="CNY">CNY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentFormData.amount}
                    onChange={e => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date') || 'Date'}</label>
                <input
                  type="date"
                  required
                  value={paymentFormData.payment_date}
                  onChange={e => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('insurance.paymentAccount') || 'Payment Account'}</label>
                <select
                  value={paymentFormData.account_id}
                  onChange={e => setPaymentFormData({...paymentFormData, account_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('common.select') || 'Select...'}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes') || 'Notes'}</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
