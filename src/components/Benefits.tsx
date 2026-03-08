import React, { useState, useEffect } from 'react';
import { Plus, Gift, Calendar, CheckCircle, XCircle, Clock, Trash2, Edit2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday } from 'date-fns';

interface Benefit {
  id: number;
  name: string;
  source: string;
  expiration_date: string | null;
  total_count: number | null;
  used_count: number;
  type: 'TOTAL' | 'PERIODIC';
  period: 'YEARLY' | 'MONTHLY' | null;
  status: 'ACTIVE' | 'EXPIRED' | 'USED_UP';
  notes: string;
  usages?: any[];
}

export function Benefits({ currentUser }: { currentUser?: any }) {
  const { t } = useTranslation();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteUsageConfirmId, setDeleteUsageConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingUsagesId, setViewingUsagesId] = useState<number | null>(null);
  const [editingUsageId, setEditingUsageId] = useState<number | null>(null);
  const [usageFormData, setUsageFormData] = useState({ usage_date: '', notes: '' });
  const [formData, setFormData] = useState<Partial<Benefit>>({
    name: '',
    source: '',
    expiration_date: '',
    total_count: null,
    used_count: 0,
    type: 'TOTAL',
    period: null,
    status: 'ACTIVE',
    notes: ''
  });

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    try {
      const res = await fetch('/api/benefits');
      const data = await res.json();
      setBenefits(data);
    } catch (error) {
      console.error('Failed to fetch benefits:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`/api/benefits/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('/api/benefits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', source: '', expiration_date: '', total_count: null, used_count: 0, type: 'TOTAL', period: null, status: 'ACTIVE', notes: '' });
      fetchBenefits();
    } catch (error) {
      console.error('Failed to save benefit:', error);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await fetch(`/api/benefits/${deleteConfirmId}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchBenefits();
    } catch (error) {
      console.error('Failed to delete benefit:', error);
    }
  };

  const handleUse = async (benefit: Benefit) => {
    try {
      await fetch(`/api/benefits/${benefit.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usage_date: new Date().toISOString().split('T')[0],
          notes: '',
          operator_name: currentUser?.name || 'System'
        })
      });
      fetchBenefits();
    } catch (error) {
      console.error('Failed to use benefit:', error);
    }
  };

  const handleEditUsage = (usage: any) => {
    setEditingUsageId(usage.id);
    setUsageFormData({ usage_date: usage.usage_date, notes: usage.notes || '' });
  };

  const handleSaveUsage = async (usageId: number) => {
    try {
      await fetch(`/api/benefit-usages/${usageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...usageFormData,
          operator_name: currentUser?.name || 'System'
        })
      });
      setEditingUsageId(null);
      fetchBenefits();
    } catch (error) {
      console.error('Failed to save usage:', error);
    }
  };

  const handleDeleteUsage = async (usageId: number) => {
    setDeleteUsageConfirmId(usageId);
  };

  const confirmDeleteUsage = async () => {
    if (!deleteUsageConfirmId) return;
    try {
      await fetch(`/api/benefit-usages/${deleteUsageConfirmId}`, { method: 'DELETE' });
      setDeleteUsageConfirmId(null);
      fetchBenefits();
    } catch (error) {
      console.error('Failed to delete usage:', error);
    }
  };

  const getStatusColor = (benefit: Benefit) => {
    if (benefit.status === 'USED_UP') return 'bg-gray-100 text-gray-600';
    if (benefit.expiration_date && isPast(new Date(benefit.expiration_date)) && !isToday(new Date(benefit.expiration_date))) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-emerald-100 text-emerald-700';
  };

  const toggleStatus = async (benefit: Benefit) => {
    try {
      const newStatus = benefit.status === 'ACTIVE' ? 'USED_UP' : 'ACTIVE';
      await fetch(`/api/benefits/${benefit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...benefit,
          status: newStatus
        })
      });
      fetchBenefits();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const getStatusText = (benefit: Benefit) => {
    if (benefit.status === 'USED_UP') return t('benefits.usedUp') || 'Used Up';
    if (benefit.expiration_date && isPast(new Date(benefit.expiration_date)) && !isToday(new Date(benefit.expiration_date))) {
      return t('benefits.expired') || 'Expired';
    }
    return t('benefits.active') || 'Active';
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

      {/* Delete Usage Confirmation Modal */}
      {deleteUsageConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('common.confirmDelete')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUsageConfirmId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteUsage}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('common.benefits') || 'Benefits'}</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', source: '', expiration_date: '', total_count: null, used_count: 0, type: 'TOTAL', period: null, status: 'ACTIVE', notes: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          {t('common.add') || 'Add'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? (t('common.edit') || 'Edit') : (t('common.add') || 'Add')} {t('common.benefits') || 'Benefit'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.name') || 'Benefit Name'}</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('benefits.namePlaceholder') || 'e.g. Free Car Wash'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.source') || 'Source'}</label>
                <input
                  type="text"
                  value={formData.source || ''}
                  onChange={e => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('benefits.sourcePlaceholder') || 'e.g. Insurance Company'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.type') || 'Type'}</label>
                <select
                  value={formData.type || 'TOTAL'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'TOTAL' | 'PERIODIC' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="TOTAL">{t('benefits.typeTotal') || 'Total Count'}</option>
                  <option value="PERIODIC">{t('benefits.typePeriodic') || 'Periodic'}</option>
                </select>
              </div>
              {formData.type === 'PERIODIC' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.period') || 'Period'}</label>
                  <select
                    value={formData.period || 'YEARLY'}
                    onChange={e => setFormData({ ...formData, period: e.target.value as 'YEARLY' | 'MONTHLY' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="YEARLY">{t('benefits.periodYearly') || 'Yearly'}</option>
                    <option value="MONTHLY">{t('benefits.periodMonthly') || 'Monthly'}</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.expirationDate') || 'Expiration Date'}</label>
                <input
                  type="date"
                  value={formData.expiration_date || ''}
                  onChange={e => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('benefits.totalCount') || 'Total Allowed Usages'}</label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_count || ''}
                  onChange={e => setFormData({ ...formData, total_count: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('benefits.unlimited') || 'Leave empty for unlimited'}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes') || 'Notes'}</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('common.save') || 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {benefits.map(benefit => (
          <div key={benefit.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${getStatusColor(benefit)} cursor-pointer`} onClick={() => toggleStatus(benefit)} title={t('benefits.toggleStatus') || 'Toggle Status'}>
                  <Gift size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{benefit.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusColor(benefit)}`}>
                      {getStatusText(benefit)}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {benefit.type === 'TOTAL' ? (t('benefits.typeTotal') || 'Total Count') : (t('benefits.typePeriodic') || 'Periodic')}
                    </span>
                    {benefit.type === 'PERIODIC' && benefit.period && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {benefit.period === 'YEARLY' ? (t('benefits.periodYearly') || 'Yearly') : (t('benefits.periodMonthly') || 'Monthly')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setFormData(benefit);
                    setEditingId(benefit.id);
                    setIsAdding(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(benefit.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              {benefit.source && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{t('benefits.source') || 'Source'}:</span> {benefit.source}
                </div>
              )}
              {benefit.expiration_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{t('benefits.expires') || 'Expires'}: {benefit.expiration_date}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle size={14} className="text-gray-400" />
                <span>
                  {t('benefits.usage') || 'Usage'}: {benefit.used_count} 
                  {benefit.total_count ? ` / ${benefit.total_count}` : ` (${t('benefits.unlimited') || 'Unlimited'})`}
                </span>
              </div>

              {benefit.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{benefit.notes}</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => handleUse(benefit)}
                disabled={benefit.status === 'USED_UP' || (benefit.expiration_date ? isPast(new Date(benefit.expiration_date)) && !isToday(new Date(benefit.expiration_date)) : false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Check size={16} />
                {t('benefits.markUsed') || 'Mark Used'}
              </button>
              <button
                onClick={() => setViewingUsagesId(viewingUsagesId === benefit.id ? null : benefit.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Clock size={16} />
                {t('benefits.history') || 'History'}
              </button>
            </div>
            
            {viewingUsagesId === benefit.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('benefits.usageHistory') || 'Usage History'}</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {benefit.usages && benefit.usages.length > 0 ? (
                    benefit.usages.map((u: any) => (
                      <div key={u.id} className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {editingUsageId === u.id ? (
                          <div className="space-y-2">
                            <input
                              type="date"
                              value={usageFormData.usage_date}
                              onChange={(e) => setUsageFormData({ ...usageFormData, usage_date: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <input
                              type="text"
                              value={usageFormData.notes}
                              onChange={(e) => setUsageFormData({ ...usageFormData, notes: e.target.value })}
                              placeholder={t('common.notes') || 'Notes'}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => setEditingUsageId(null)}
                                className="px-2 py-1 text-gray-600 hover:bg-gray-200 rounded"
                              >
                                {t('common.cancel') || 'Cancel'}
                              </button>
                              <button
                                onClick={() => handleSaveUsage(u.id)}
                                className="px-2 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded"
                              >
                                {t('common.save') || 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-gray-700">{u.usage_date}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditUsage(u)}
                                  className="text-gray-400 hover:text-indigo-600 p-1"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUsage(u.id)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            {u.notes && <div className="text-gray-500 mt-1">{u.notes}</div>}
                            {u.operator_name && (
                              <div className="text-gray-400 mt-1 italic">
                                {t('common.operator') || 'Operator'}: {u.operator_name}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-2">{t('common.noRecords') || 'No records'}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {benefits.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
            <Gift className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">{t('benefits.noBenefits') || 'No benefits recorded'}</h3>
            <p className="text-gray-500 mt-1">{t('benefits.addFirst') || 'Add your first benefit to start tracking.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
