import React, { useState, useEffect } from 'react';
import { Document } from '../types';
import { FileText, Download, Trash2, Search, Plus } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { downloadFile } from '../lib/download';
import { formatTimeAgo } from '../lib/formatTime';
import { LiveTime } from './LiveTime';

interface DocumentsTabProps {
  projectId: string;
  token: string | null;
  role: string | undefined;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ projectId, token, role }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, [projectId]);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setDocs(Array.isArray(data) ? data : (Array.isArray(data?.documents) ? data.documents : []));
      } else {
        setDocs([]);
      }
    } catch (err) {
      console.error(err);
      setDocs([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const newDoc = await res.json().catch(() => ({}));
        setDocs([...docs, newDoc]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteClick = (docId: string) => setDocToDelete(docId);
  const handleDelete = async () => {
    if(!docToDelete) return;
    setIsDeleting(true);
    const docId = docToDelete;
    
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 404) {
        setDocs(prev => prev.filter((d) => d.id !== docId && (d as any)._id !== docId));
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Failed to delete document');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDocToDelete(null);
      fetchDocs();
    }
  };

  const safeDocs = Array.isArray(docs) ? docs : [];
  const filtered = safeDocs.filter((d) => (d.name || '').toLowerCase().includes(search.toLowerCase()));

  const canManage = role === 'Admin' || role === 'Project Manager';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="mb-6">
        <h2 className="font-sans font-black text-lg text-slate-800 uppercase tracking-tight">Project Documents</h2>
      </div>

      {/* Action Header */}
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

        <label className="flex items-center gap-2 bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer shadow-md transition-all">
          <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Add Documents'}
          <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} accept=".pdf,.doc,.docx" />
        </label>
      </div>

      {/* Grid of Documents matching Page 12 table layout */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse ">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider rounded-tl-xl">Attachments</th>
              <th className="py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider">Upload Time</th>
              <th className="py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider">Uploaded By</th>
              <th className="py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider text-center rounded-tr-xl">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-sans bg-white">No documents added yet.</td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50 bg-white">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-50 text-red-500 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-sm text-slate-800">{doc.name}</span>
                        <span className="font-sans text-[10px] text-slate-400">{doc.size}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-sans text-xs text-slate-500 font-medium">
                    <LiveTime time={doc.uploadDate} />
                  </td>
                  <td className="py-3.5 px-4 font-sans text-xs text-slate-700 font-bold">{doc.uploadBy}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => downloadFile(doc.fileUrl, doc.name, token)}
                        className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(doc.id || (doc as any)._id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={!!docToDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This will permanently remove the file."
        onConfirm={handleDelete}
        onCancel={() => setDocToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
