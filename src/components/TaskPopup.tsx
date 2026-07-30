import React, { useState, useEffect } from 'react';
import { Task, Comment, Attachment, User } from '../types';
import { X, Plus, Trash2, Download, Send, FileText, Calendar, Tag, Info, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { downloadFile } from '../lib/download';
import { formatTimeAgo } from '../lib/formatTime';
import { LiveTime } from './LiveTime';

interface TaskPopupProps {
  taskId: string;
  projectId: string;
  projectName: string;
  token: string | null;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
}

export const TaskPopup: React.FC<TaskPopupProps> = ({ taskId, projectId, projectName, token, onClose, onUpdateTask }) => {
  const { user } = useAuth();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const formatDueDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const MONTH_MAP: Record<string, string> = {
      january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
      april: '04', apr: '04', may: '05', june: '06', jun: '06', july: '07', jul: '07',
      august: '08', aug: '08', september: '09', sep: '09', sept: '09', october: '10', oct: '10',
      november: '11', nov: '11', december: '12', dec: '12'
    };

    const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = MONTH_MAP[dmyMatch[2].toLowerCase()];
      const year = dmyMatch[3];
      if (month) return `${year}-${month}-${day}`;
    }

    const mdyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (mdyMatch) {
      const month = MONTH_MAP[mdyMatch[1].toLowerCase()];
      const day = mdyMatch[2].padStart(2, '0');
      const year = mdyMatch[3];
      if (month) return `${year}-${month}-${day}`;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const userOffset = d.getTimezoneOffset() * 60000;
      const localD = new Date(d.getTime() + userOffset);
      const year = localD.getFullYear();
      const month = String(localD.getMonth() + 1).padStart(2, '0');
      const day = String(localD.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  useEffect(() => {
    fetchTask();
    fetchUsers();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const found = await res.json().catch(() => ({}));
        setTask(found);
      } else if (projectId) {
        const res2 = await fetch(`/api/projects/${projectId}/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res2.ok) {
          const tasks: Task[] = await res2.json().catch(() => ({}));
          const found = tasks.find((t) => t.id === taskId);
          if (found) setTask(found);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;
    const prevTask = { ...task };
    const updatedOptimistic = { ...task, status: newStatus };
    setTask(updatedOptimistic);
    onUpdateTask(updatedOptimistic);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setTask(updated);
        onUpdateTask(updated);
      } else {
        setTask(prevTask);
        onUpdateTask(prevTask);
      }
    } catch (err) {
      console.error(err);
      setTask(prevTask);
      onUpdateTask(prevTask);
    }
  };

  const handlePriorityChange = async (newPriority: Task['priority']) => {
    if (!task) return;
    const prevTask = { ...task };
    const updatedOptimistic = { ...task, priority: newPriority };
    setTask(updatedOptimistic);
    onUpdateTask(updatedOptimistic);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ priority: newPriority })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setTask(updated);
        onUpdateTask(updated);
      } else {
        setTask(prevTask);
        onUpdateTask(prevTask);
      }
    } catch (err) {
      console.error(err);
      setTask(prevTask);
      onUpdateTask(prevTask);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!task) return;
    const prevTask = { ...task };
    const assigneeName = users.find(u => u.id === newAssigneeId)?.name || 'Unassigned';
    const updatedOptimistic = { ...task, assigneeId: newAssigneeId, assignee: assigneeName };
    setTask(updatedOptimistic);
    onUpdateTask(updatedOptimistic);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assigneeId: newAssigneeId })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setTask(updated);
        onUpdateTask(updated);
      } else {
        setTask(prevTask);
        onUpdateTask(prevTask);
      }
    } catch (err) {
      console.error(err);
      setTask(prevTask);
      onUpdateTask(prevTask);
    }
  };

  const handleDueDateChange = async (newDueDate: string) => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dueDate: newDueDate })
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        setTask(updated);
        onUpdateTask(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleEditComment = async (commentId: string) => {
    if (!task || !editCommentContent.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editCommentContent })
      });
      if (res.ok) {
        const updatedComment = await res.json().catch(() => ({}));
        const updatedTask = {
          ...task,
          comments: (task.comments || []).map(c => c.id === commentId ? updatedComment : c)
        };
        setTask(updatedTask);
        onUpdateTask(updatedTask);
        setEditingCommentId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async () => {
    if (!task || !commentToDelete) return;
    const commId = commentToDelete;
    setCommentToDelete(null);
    const updatedTask = {
      ...task,
      comments: (task.comments || []).filter(c => c.id !== commId)
    };
    setTask(updatedTask);
    onUpdateTask(updatedTask);
    try {
      await fetch(`/api/tasks/${task.id}/comments/${commId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!task || !newComment.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const addedComment = await res.json().catch(() => ({}));
        const updatedTask = {
          ...task,
          comments: [...(task.comments || []), addedComment]
        };
        setTask(updatedTask);
        onUpdateTask(updatedTask);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const newAttachment = await res.json().catch(() => ({}));
        const updatedTask = {
          ...task,
          attachments: [...(task.attachments || []), newAttachment]
        };
        setTask(updatedTask);
        onUpdateTask(updatedTask);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!task || !attachmentToDelete) return;
    const attachId = attachmentToDelete;
    setAttachmentToDelete(null);
    const updatedTask = {
      ...task,
      attachments: !task.attachments ? [] : task.attachments.filter((a) => a.id !== attachId)
    };
    setTask(updatedTask);
    onUpdateTask(updatedTask);
    try {
      await fetch(`/api/tasks/${task.id}/attachments/${attachId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    const targetId = task.id;
    setShowTaskDeleteConfirm(false);
    onClose();
    try {
      await fetch(`/api/tasks/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!task) return null;

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';
  const assigneeUser = users.find((u) => u.name === task.assignee);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-blue-600 text-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-sky-400">
        
        {/* Header Breadcrumb & Controls */}
        <div className="p-5 flex items-center justify-between border-b border-sky-300 flex-shrink-0">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-sky-100 font-bold">
              {projectName} &gt; TASKS &gt; {task.id}
            </span>
            <h1 className="font-sans font-black text-2xl tracking-tight mt-1">{task.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowTaskDeleteConfirm(true)}
                className="flex items-center gap-1.5 bg-red-500/80 hover:bg-red-600 text-white font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Task
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-sky-500 rounded-lg transition-colors text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Container Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-sky-500/10">
          
          {/* Description Block */}
          <div className="bg-[#e0f7ff] text-sky-900 p-5 rounded-xl border border-sky-200">
            <p className="font-sans text-xs sm:text-sm leading-relaxed">{task.description}</p>
          </div>

          {/* Metadata Block Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 p-4 rounded-xl border border-white/10">
            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-sans font-bold text-sky-100 uppercase tracking-wider">Assignee</span>
              <div className="flex items-center gap-1.5">
                <img
                  src={assigneeUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt="Assignee"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-white/20 flex-shrink-0"
                />
                <select
                  disabled={!canManage}
                  value={task.assigneeId || users.find(u => u.name === task.assignee)?.id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className={`bg-white text-slate-800 border-none outline-none font-sans font-bold text-xs rounded px-2 py-1 focus:ring-2 focus:ring-sky-300 transition-colors shadow-sm max-w-[110px] ${canManage ? 'cursor-pointer hover:bg-slate-50' : 'opacity-70 cursor-not-allowed'}`}
                >
                  <option value="" className="text-slate-800">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="text-slate-800">{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5 border-l border-white/10 pl-4">
              <span className="text-[10px] font-sans font-bold text-sky-100 uppercase tracking-wider">Due Date</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-100 flex-shrink-0" />
                <input
                  type="date"
                  disabled={!canManage}
                  value={formatDueDateForInput(task.dueDate)}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className={`bg-white/10 border-none outline-none font-sans font-bold text-xs text-white rounded px-1.5 py-0.5 focus:bg-sky-600 transition-colors w-28 ${canManage ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5 border-l border-white/10 pl-4">
              <span className="text-[10px] font-sans font-bold text-sky-100 uppercase tracking-wider">Priority</span>
              <select
                disabled={!canManage}
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as Task['priority'])}
                className={`bg-white text-slate-800 border-none outline-none font-sans font-bold text-xs rounded px-2 py-1 focus:ring-2 focus:ring-sky-300 transition-colors shadow-sm w-24 ${canManage ? 'cursor-pointer hover:bg-slate-50' : 'opacity-70 cursor-not-allowed'}`}
              >
                <option value="Low" className="text-slate-800">Low</option>
                <option value="Medium" className="text-slate-800">Medium</option>
                <option value="High" className="text-slate-800">High</option>
                <option value="Critical" className="text-slate-800">Critical</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5 border-l border-white/10 pl-4">
              <span className="text-[10px] font-sans font-bold text-sky-100 uppercase tracking-wider">Status</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
                className="bg-white text-slate-800 border-none outline-none font-sans font-bold text-xs rounded px-2 py-1 focus:ring-2 focus:ring-sky-300 transition-colors shadow-sm w-28 cursor-pointer hover:bg-slate-50"
              >
                <option value="To Do" className="text-slate-800">To Do</option>
                <option value="In Progress" className="text-slate-800">In Progress</option>
                <option value="Review" className="text-slate-800">Review</option>
                <option value="Completed" className="text-slate-800">Completed</option>
              </select>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-base tracking-tight">Attachments</h2>
              <label className="p-1 hover:bg-sky-600 rounded-lg cursor-pointer transition-colors text-white" title="Upload Attachment">
                <Plus className="w-5 h-5" />
                <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} accept=".pdf,.doc,.docx" />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {!task.attachments || task.attachments.length === 0 ? (
                <p className="text-xs text-sky-100 font-sans italic">No attachments added yet.</p>
              ) : (
                task.attachments?.map((attach, idx) => (
                  <div key={`${attach.id}-${idx}`} className="flex items-center justify-between p-3 bg-white text-slate-800 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans font-bold text-xs text-slate-800">{attach.name}</span>
                        <span className="font-sans text-[10px] text-slate-400"><LiveTime time={attach.uploadedAt} /> by {attach.uploadedBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => downloadFile(attach.fileUrl, attach.name, token)} type="button" className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {canManage && (
                        <button onClick={() => setAttachmentToDelete(attach.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400" title="Delete Attachment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments and Activity Threads */}
          <div className="bg-white text-slate-800 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 shadow-inner">
            <h2 className="font-sans font-bold text-sm text-slate-700">Comments & Activity</h2>
            
            {/* Input fields */}
            <form onSubmit={handleAddComment} className="flex items-center gap-3 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-500 bg-slate-50">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-transparent border-none outline-none font-sans text-xs text-slate-800 w-full placeholder-slate-400"
              />
              <button type="submit" className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                <Send className="w-3 h-3" /> Posts
              </button>
            </form>

            {/* Comment Thread List */}
            <div className="flex flex-col gap-3 mt-2 max-h-48 overflow-y-auto">
              {!task.comments || task.comments.length === 0 ? (
                <p className="text-xs text-slate-400 font-sans italic">No comments added yet.</p>
              ) : (

                task.comments?.map((comm, idx) => {
                  const canEditDelete = user?.role === 'Admin' || user?.id === comm.userId;
                  return (
                  <div key={`${comm.id}-${idx}`} className="flex gap-3 items-start border-b border-slate-50 pb-3 group">
                    <img
                      src={comm.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-slate-100 mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5 w-full">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-bold text-xs text-slate-800">{comm.userName}</span>
                          <LiveTime className="font-sans text-[10px] text-slate-400" time={comm.timestamp} />
                        </div>
                        {canEditDelete && (
                          <div className="flex items-center gap-1 transition-opacity">
                            <button
                              type="button" onClick={() => { setEditingCommentId(comm.id); setEditCommentContent(comm.content); }}
                              className="p-1.5 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-md transition-colors"
                            >
                              <Edit2 className="w-4 h-4 pointer-events-none" />
                            </button>
                            <button
                              type="button" onClick={() => setCommentToDelete(comm.id)}
                              className="p-1.5 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === comm.id ? (
                        <div className="flex flex-col gap-2 mt-1 w-full pr-4">
                          <textarea
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            className="w-full bg-white border border-slate-200 outline-none px-3 py-2 rounded-lg text-xs font-sans text-slate-800 resize-none focus:border-blue-500"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleEditComment(comm.id)} className="text-xs font-bold text-white bg-[#00adef] hover:bg-sky-500 px-3 py-1.5 rounded-md transition-colors">Save</button>
                            <button type="button" onClick={() => setEditingCommentId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="font-sans text-xs text-slate-600 leading-relaxed pr-4">{comm.content}</p>
                      )}
                    </div>
                  </div>
                )})

              )}
            </div>
          </div>

        </div>
      </div>
      <ConfirmModal
        isOpen={!!attachmentToDelete}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This will permanently remove the data."
        onConfirm={handleDeleteAttachment}
        onCancel={() => setAttachmentToDelete(null)}
        isLoading={isDeleting}
      />
      <ConfirmModal
        isOpen={showTaskDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleDeleteTask}
        onCancel={() => setShowTaskDeleteConfirm(false)}
        isLoading={isDeleting}
      />
      <ConfirmModal
        isOpen={!!commentToDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This will permanently remove the data."
        onConfirm={handleDeleteComment}
        onCancel={() => setCommentToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
