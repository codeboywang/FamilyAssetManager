import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Gift, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenqingRecord {
  id: number;
  record_date: string;
  type: 'IN' | 'OUT';
  person: string;
  event: string;
  item: string;
  amount: number;
  notes: string;
}

interface RenqingStats {
  byPerson: { person: string; total_in: number; total_out: number; count: number }[];
  byEvent: { event: string; total_in: number; total_out: number; count: number }[];
}

export function Renqing() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'records' | 'stats'>('records');
  const [records, setRecords] = useState<RenqingRecord[]>([]);
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [stats, setStats] = useState<RenqingStats>({ byPerson: [], byEvent: [] });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [newEventName, setNewEventName] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<RenqingRecord> & { hasItem?: boolean; hasRedEnvelope?: boolean }>({
    record_date: new Date().toISOString().split('T')[0],
    type: 'OUT',
    person: '',
    event: '',
    item: '',
    amount: 0,
    notes: '',
    hasItem: false,
    hasRedEnvelope: true
  });

  // Filter State
  const [filter, setFilter] = useState({
    person: '',
    event: '',
    type: ''
  });

  useEffect(() => {
    fetchRecords();
    fetchStats();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/renqing/events');
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events', error);
    }
  };

  const handleAddEvent = async () => {
    if (!newEventName.trim()) return;
    try {
      const res = await fetch('/api/renqing/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEventName })
      });
      if (res.ok) {
        const newEvent = await res.json();
        setEvents(prev => [...prev, newEvent]);
        setFormData(prev => ({ ...prev, event: newEvent.name }));
        setNewEventName('');
        setShowEventForm(false);
      }
    } catch (error) {
      console.error('Failed to add event', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filter as any).toString();
      const res = await fetch(`/api/renqing?${query}`);
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch renqing records', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/renqing/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch renqing stats', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = formData.id ? `/api/renqing/${formData.id}` : '/api/renqing';
      const method = formData.id ? 'PUT' : 'POST';
      
      // Prepare final item string
      let finalItem = '';
      if (formData.hasItem && formData.hasRedEnvelope) {
        finalItem = `${t('renqing.item') || 'Item'}: ${formData.item}, ${t('renqing.redEnvelope') || 'Red Envelope'}`;
      } else if (formData.hasItem) {
        finalItem = formData.item || '';
      } else if (formData.hasRedEnvelope) {
        finalItem = t('renqing.redEnvelope') || 'Red Envelope';
      }

      if (!finalItem && !formData.hasItem && !formData.hasRedEnvelope) {
        finalItem = '-'; // Fallback for NOT NULL constraint
      }

      const payload = {
        ...formData,
        item: finalItem,
        amount: formData.hasRedEnvelope ? formData.amount : null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          record_date: new Date().toISOString().split('T')[0],
          type: 'OUT',
          person: '',
          event: '',
          item: '',
          amount: 0,
          notes: '',
          hasItem: false,
          hasRedEnvelope: true
        });
        fetchRecords();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to save record', error);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await fetch(`/api/renqing/${deleteConfirmId}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchRecords();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete record', error);
    }
  };

  const handleEdit = (record: RenqingRecord) => {
    const hasRedEnvelope = record.item.includes(t('renqing.redEnvelope') || 'Red Envelope');
    let itemValue = record.item;
    if (hasRedEnvelope) {
      itemValue = record.item.replace(new RegExp(`,? ?${t('renqing.redEnvelope') || 'Red Envelope'}`, 'g'), '')
                             .replace(new RegExp(`${t('renqing.item') || 'Item'}: `, 'g'), '');
    }
    
    setFormData({
      ...record,
      hasItem: itemValue.length > 0,
      hasRedEnvelope,
      item: itemValue
    });
    setShowForm(true);
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

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="text-indigo-600" />
          {t('renqing.title') || 'Renqing (Favors)'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('records')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'records' ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {t('renqing.records') || 'Records'}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'stats' ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {t('renqing.stats') || 'Statistics'}
          </button>
        </div>
      </div>

      {activeTab === 'records' && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder={t('renqing.searchPerson') || 'Search Person'}
                className="px-3 py-2 border rounded-lg text-sm"
                value={filter.person}
                onChange={e => setFilter({ ...filter, person: e.target.value })}
              />
              <input
                type="text"
                placeholder={t('renqing.searchEvent') || 'Search Event'}
                className="px-3 py-2 border rounded-lg text-sm"
                value={filter.event}
                onChange={e => setFilter({ ...filter, event: e.target.value })}
              />
              <select
                className="px-3 py-2 border rounded-lg text-sm"
                value={filter.type}
                onChange={e => setFilter({ ...filter, type: e.target.value })}
              >
                <option value="">{t('common.all') || 'All Types'}</option>
                <option value="IN">{t('renqing.received') || 'Received'}</option>
                <option value="OUT">{t('renqing.given') || 'Given'}</option>
              </select>
              <button
                onClick={fetchRecords}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2"
              >
                <Search size={16} />
                {t('common.search') || 'Search'}
              </button>
              <button
                onClick={() => {
                  setFormData({
                    record_date: new Date().toISOString().split('T')[0],
                    type: 'OUT',
                    person: '',
                    event: '',
                    item: '',
                    amount: 0,
                    notes: '',
                    hasItem: false,
                    hasRedEnvelope: true
                  });
                  setShowForm(true);
                }}
                className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus size={16} />
                {t('renqing.add') || 'Add Record'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900">
                  {formData.id ? (t('renqing.edit') || 'Edit Record') : (t('renqing.add') || 'Add Record')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date') || 'Date'}</label>
                      <input
                        type="date"
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                        value={formData.record_date}
                        onChange={e => setFormData({ ...formData, record_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type') || 'Type'}</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' })}
                      >
                        <option value="OUT">{t('renqing.given') || 'Given (Out)'}</option>
                        <option value="IN">{t('renqing.received') || 'Received (In)'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('renqing.person') || 'Person'}</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                        value={formData.person}
                        onChange={e => setFormData({ ...formData, person: e.target.value })}
                        placeholder="e.g. Uncle John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('renqing.event') || 'Event'}</label>
                      <div className="flex gap-2">
                        <select
                          required
                          className="flex-1 px-3 py-2 border rounded-lg"
                          value={formData.event}
                          onChange={e => setFormData({ ...formData, event: e.target.value })}
                        >
                          <option value="">{t('common.select') || 'Select Event'}</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.name}>{ev.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowEventForm(true)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          title={t('renqing.addEvent') || 'Add Event'}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {showEventForm && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder={t('renqing.newEventName') || 'New Event Name'}
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                        value={newEventName}
                        onChange={e => setNewEventName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddEvent}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"
                      >
                        {t('common.add') || 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEventForm(false)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm"
                      >
                        {t('common.cancel') || 'Cancel'}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded"
                          checked={formData.hasRedEnvelope}
                          onChange={e => setFormData({ ...formData, hasRedEnvelope: e.target.checked })}
                        />
                        <span className="text-sm font-medium text-gray-700">{t('renqing.redEnvelope') || 'Red Envelope'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded"
                          checked={formData.hasItem}
                          onChange={e => setFormData({ ...formData, hasItem: e.target.checked })}
                        />
                        <span className="text-sm font-medium text-gray-700">{t('renqing.item') || 'Item'}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {formData.hasRedEnvelope && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.amount') || 'Amount'}</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 border rounded-lg"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      )}
                      {formData.hasItem && (
                        <div className={cn(!formData.hasRedEnvelope && "col-span-2")}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('renqing.itemName') || 'Item Name'}</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg"
                            value={formData.item}
                            onChange={e => setFormData({ ...formData, item: e.target.value })}
                            placeholder="e.g. Tea Set"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes') || 'Notes'}</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      {t('common.save') || 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {records.map(record => (
              <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    record.type === 'IN' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {record.type === 'IN' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{record.person} - {record.event}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 truncate">
                      <Calendar size={12} className="flex-shrink-0" />
                      <span className="truncate">{record.record_date} • {record.item}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0">
                  {record.amount !== null && record.amount !== undefined && (
                    <div className={cn(
                      "font-bold text-lg",
                      record.type === 'IN' ? "text-green-600" : "text-red-600"
                    )}>
                      {record.type === 'IN' ? '+' : '-'}{record.amount.toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(record)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      {t('common.edit') || 'Edit'}
                    </button>
                    <button onClick={() => handleDelete(record.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      {t('common.delete') || 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {t('common.noRecords') || 'No records found'}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'stats' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('renqing.byPerson') || 'By Person'}</h3>
            <div className="space-y-4">
              {stats.byPerson.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{stat.person}</div>
                  <div className="text-right">
                    <div className="text-green-600 text-sm">+{stat.total_in.toLocaleString()}</div>
                    <div className="text-red-600 text-sm">-{stat.total_out.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('renqing.byEvent') || 'By Event'}</h3>
            <div className="space-y-4">
              {stats.byEvent.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{stat.event}</div>
                  <div className="text-right">
                    <div className="text-green-600 text-sm">+{stat.total_in.toLocaleString()}</div>
                    <div className="text-red-600 text-sm">-{stat.total_out.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
