import { useEffect, useState } from 'react';
import React from 'react';
import { Plus, Trash2, User, Users, Edit2, X, Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function Members() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  
  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberIsAdmin, setNewMemberIsAdmin] = useState(false);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState<number[]>([]);

  // Edit Member State
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editFamilies, setEditFamilies] = useState<number[]>([]);

  // Family State
  const [newFamilyName, setNewFamilyName] = useState('');
  
  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const [familyToDelete, setFamilyToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchFamilies();
  }, []);

  const fetchMembers = () => {
    fetch('/api/members').then(res => res.json()).then(setMembers);
  };

  const fetchFamilies = () => {
    fetch('/api/families').then(res => res.json()).then(setFamilies);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName) return;

    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newMemberName, 
        role: newMemberRole, 
        familyIds: selectedFamilies,
        is_admin: newMemberIsAdmin,
        password: newMemberPassword
      }),
    });
    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberIsAdmin(false);
    setNewMemberPassword('');
    setSelectedFamilies([]);
    fetchMembers();
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editName) return;

    await fetch(`/api/members/${editingMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: editName, 
        role: editRole, 
        familyIds: editFamilies,
        is_admin: editIsAdmin,
        password: editPassword // Only send if changed/set
      }),
    });
    setEditingMember(null);
    fetchMembers();
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    await fetch(`/api/members/${memberToDelete}`, { method: 'DELETE' });
    fetchMembers();
    setMemberToDelete(null);
  };

  const startEditing = (member: any) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role || '');
    setEditIsAdmin(!!member.is_admin);
    setEditPassword(''); // Don't show old password
    setEditFamilies(member.familyIds || []);
  };

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName) return;

    await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFamilyName }),
    });
    setNewFamilyName('');
    fetchFamilies();
  };

  const handleDeleteFamily = async () => {
    if (!familyToDelete) return;
    await fetch(`/api/families/${familyToDelete}`, { method: 'DELETE' });
    fetchFamilies();
    setFamilyToDelete(null);
  };

  const toggleFamilySelection = (id: number, isEdit = false) => {
    if (isEdit) {
      setEditFamilies(prev => 
        prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      );
    } else {
      setSelectedFamilies(prev => 
        prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Families Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('families.title')}</h2>
            <p className="text-gray-500">{t('families.manageFamilies')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {families.map((family) => (
            <div key={family.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <Users size={20} />
                </div>
                <h3 className="font-semibold text-gray-900">{family.name}</h3>
              </div>
              <button 
                onClick={() => setFamilyToDelete(family.id)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* Add Family Card */}
          <form onSubmit={handleAddFamily} className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 flex items-center gap-2">
            <input
              type="text"
              placeholder={t('families.namePlaceholder')}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={newFamilyName}
              onChange={e => setNewFamilyName(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!newFamilyName}
              className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{t('members.title')}</h2>
          <p className="text-gray-500">{t('members.subtitle')}</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 group relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 relative">
                    <User size={24} />
                    {member.is_admin === 1 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 border-2 border-white" title="Admin">
                        <Shield size={10} className="text-white fill-current" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.role || t('members.defaultRole')}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEditing(member)}
                    className="text-gray-400 hover:text-indigo-500"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setMemberToDelete(member.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Family Tags */}
              <div className="flex flex-wrap gap-2">
                {member.familyIds && member.familyIds.map((fid: number) => {
                  const family = families.find(f => f.id === fid);
                  return family ? (
                    <span key={fid} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md flex items-center gap-1">
                      <Users size={12} /> {family.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
  
          {/* Add New Member Card */}
          <form onSubmit={handleAddMember} className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 flex flex-col gap-3">
            <h3 className="font-medium text-gray-900">{t('members.addMember')}</h3>
            <input
              type="text"
              placeholder={t('members.namePlaceholder')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
            />
            <input
              type="text"
              placeholder={t('members.rolePlaceholder')}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newMemberRole}
              onChange={e => setNewMemberRole(e.target.value)}
            />
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="newIsAdmin" 
                checked={newMemberIsAdmin} 
                onChange={e => setNewMemberIsAdmin(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="newIsAdmin" className="text-sm text-gray-700">Is Admin</label>
            </div>

            {newMemberIsAdmin && (
              <input
                type="password"
                placeholder="Password"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newMemberPassword}
                onChange={e => setNewMemberPassword(e.target.value)}
              />
            )}

            {/* Family Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">{t('families.selectFamily')}</label>
              <div className="flex flex-wrap gap-2">
                {families.map(f => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => toggleFamilySelection(f.id)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md border transition-colors",
                      selectedFamilies.includes(f.id) 
                        ? "bg-indigo-100 border-indigo-200 text-indigo-700" 
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={!newMemberName}
              className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={16} /> {t('common.add')}
            </button>
          </form>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">{t('members.editMember') || 'Edit Member'}</h3>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name') || 'Name'}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('members.role') || 'Role'}</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="editIsAdmin" 
                  checked={editIsAdmin} 
                  onChange={e => setEditIsAdmin(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsAdmin" className="text-sm text-gray-700">Is Admin</label>
              </div>

              {editIsAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password (Leave blank to keep unchanged)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="New Password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Families</label>
                <div className="flex flex-wrap gap-2">
                  {families.map(f => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFamilySelection(f.id, true)}
                      className={cn(
                        "px-2 py-1 text-sm rounded-md border transition-colors",
                        editFamilies.includes(f.id) 
                          ? "bg-indigo-100 border-indigo-200 text-indigo-700" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
                >
                  {t('common.saveChanges') || 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('members.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Family Confirmation Modal */}
      {familyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">{t('common.confirmDelete')}</h3>
            <p className="text-gray-500 mb-6">{t('families.deleteConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFamilyToDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteFamily}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
