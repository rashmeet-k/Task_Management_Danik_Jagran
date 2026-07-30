import React, { useState, useEffect } from 'react';
import { Annexure } from '../types';
import { FileText, Download, Trash2, Edit2, Search, Plus } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { downloadFile } from '../lib/download';
import { formatTimeAgo } from '../lib/formatTime';
import { LiveTime } from './LiveTime';

interface AnnexuresTabProps {
  projectId: string;
  token: string | null;
  role?: string;
}

export const AnnexuresTab: React.FC<AnnexuresTabProps> = ({ projectId, token, role }) => {
  const canManage = role === 'Admin' || role === 'Project Manager';
  const [annexures, setAnnexures] = useState<Annexure[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [annexToDelete, setAnnexToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchAnnexures();
  }, [projectId]);

  const fetchAnnexures = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/annexures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setAnnexures(Array.isArray(data) ? data : (Array.isArray(data?.annexures) ? data.annexures : []));
      } else {
        setAnnexures([]);
      }
    } catch (err) {
      console.error(err);
      setAnnexures([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/annexures`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const newAnnexure = await res.json().catch(() => ({}));
        setAnnexures([...annexures, newAnnexure]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditClick = (an: Annexure) => {
    setEditingId(an.id);
    setEditName(an.name);
  };

  const handleEditSave = async (annexureId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/annexures/${annexureId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setAnnexures(annexures.map((an) => an.id === annexureId ? { ...an, name: editName } : an));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (annexureId: string) => {
    setAnnexToDelete(annexureId);
  };

  const confirmDeleteAnnexure = async () => {
    if (!annexToDelete) return;
    const annexureId = annexToDelete;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/annexures/${annexureId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAnnexures(prev => prev.filter((an) => an.id !== annexureId && (an as any)._id !== annexureId));
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Failed to delete annexure');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setAnnexToDelete(null);
      fetchAnnexures();
    }
  };

  const safeAnnexures = Array.isArray(annexures) ? annexures : [];
  const filtered = safeAnnexures.filter((an) => (an.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      {/* Search & Actions bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer shadow-md shadow-sky-500/15 transition-all">
            <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Add Annexure'}
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} accept=".pdf,.doc,.docx" />
          </label>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-sans">No annexures found.</div>
        ) : (
          filtered.map((an) => (
            <div key={an.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-all">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2.5 bg-red-50 text-red-500 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  {editingId === an.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white border border-slate-200 outline-none px-2 py-1 rounded text-sm font-sans text-slate-800 w-full max-w-[200px]"
                        autoFocus
                      />
                      <button onClick={() => handleEditSave(an.id)} className="text-xs text-white bg-[#00adef] px-2 py-1 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
                    </div>
                  ) : (
                    <span className="font-sans font-bold text-sm text-slate-800 break-all">{an.name}</span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {an.size && <span className="font-sans text-[10px] text-slate-400 font-medium">{an.size} &bull; </span>}
                    <LiveTime time={an.uploadDate} className="font-sans text-[10px] text-slate-400" />
                    <span className="font-sans text-[10px] text-slate-400">&bull; by {an.uploadBy}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFile(an.fileUrl, an.name, token)}
                  className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditClick(an)}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                      title="Edit Annexure"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(an.id || (an as any)._id)}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete Annexure"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmModal
        isOpen={!!annexToDelete}
        title="Delete Annexure"
        message="Are you sure you want to delete this annexure? This will permanently remove the data."
        onConfirm={confirmDeleteAnnexure}
        onCancel={() => setAnnexToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
