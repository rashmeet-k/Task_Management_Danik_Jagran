import React, { useState } from 'react';
import { Project, TimelineMilestone } from '../types';
import { Calendar, User, Plus, CheckCircle2, Circle, Pencil, Trash2, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OverviewTabProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  token: string | null;
}


const renderDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
};
export const OverviewTab: React.FC<OverviewTabProps> = ({ project, onUpdateProject, token }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return '';
    const tzOffset = parsed.getTimezoneOffset() * 60000;
    return (new Date(parsed.getTime() - tzOffset)).toISOString().slice(0, 10);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    const tzOffset = parsed.getTimezoneOffset() * 60000;
    const localDate = new Date(parsed.getTime() + tzOffset);
    return localDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleAddClick = () => {
    if (showAddMilestone && !editingMilestoneId) {
      setShowAddMilestone(false);
    } else {
      setEditingMilestoneId(null);
      setNewMilestoneTitle('');
      setNewMilestoneDate('');
      setShowAddMilestone(true);
    }
  };

  const handleEditClick = (m: TimelineMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMilestoneId(String(m.id || (m as any)._id));
    setNewMilestoneTitle(m.title);
    setNewMilestoneDate(formatDateForInput(m.date));
    setShowAddMilestone(true);
  };

  const handleDeleteClick = async (m: TimelineMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const currentId = String(m.id || (m as any)._id);
    const updatedTimeline = project.timeline.filter(x => String(x.id || (x as any)._id) !== currentId);
    
    // Optimistic UI Update
    onUpdateProject({ timeline: updatedTimeline });
    
    if (editingMilestoneId === currentId) {
      setEditingMilestoneId(null);
      setNewMilestoneTitle('');
      setNewMilestoneDate('');
      setShowAddMilestone(false);
    }
    
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
      if (res.ok) {
        const updatedProj = await res.json().catch(() => ({}));
        onUpdateProject(updatedProj);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMilestone = async (milestoneId: string) => {
    const updatedTimeline = project.timeline.map((m) => {
      const currentId = String(m.id || (m as any)._id);
      if (currentId === String(milestoneId)) {
        return { ...m, completed: !m.completed };
      }
      return m;
    });

    // Optimistic Update
    onUpdateProject({ timeline: updatedTimeline });

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
      if (res.ok) {
        const updatedProj = await res.json().catch(() => ({}));
        onUpdateProject(updatedProj);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneDate.trim()) return;

    const displayDate = formatDateForDisplay(newMilestoneDate);
    
    let updatedTimeline;
    if (editingMilestoneId) {
      updatedTimeline = project.timeline.map(m => {
        const currentId = String(m.id || (m as any)._id);
        if (currentId === editingMilestoneId) {
          return { ...m, title: newMilestoneTitle.toUpperCase(), date: displayDate };
        }
        return m;
      });
    } else {
      const newMilestone: TimelineMilestone = {
        id: 'TL' + Date.now(),
        title: newMilestoneTitle.toUpperCase(),
        date: displayDate,
        completed: false
      };
      updatedTimeline = [...(project.timeline || []), newMilestone];
    }

    // Optimistic UI Update
    onUpdateProject({ timeline: updatedTimeline });
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setEditingMilestoneId(null);
    setShowAddMilestone(false);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ timeline: updatedTimeline })
      });
      if (res.ok) {
        const updatedProj = await res.json().catch(() => ({}));
        onUpdateProject(updatedProj);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left About & Timeline Panel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Description */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="font-sans font-bold text-lg text-slate-800 mb-3">About:</h2>
          <p className="font-sans text-sm text-slate-600 leading-relaxed">{project.description}</p>
        </div>

        {/* Timeline Visualization Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-sans font-bold text-lg text-slate-800">TIMELINE</h2>
            {isAdmin && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-sans font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            )}
          </div>

          {isAdmin && showAddMilestone && (
            <form onSubmit={handleAddMilestone} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-end">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Design Wireframes"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value.toUpperCase())}
                  className="bg-white border border-slate-200 outline-none p-2 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500 uppercase"
                />
              </div>
              <div className="w-40 flex flex-col gap-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Date</label>
                <input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="bg-white border border-slate-200 outline-none p-2 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
                />
              </div>
              <button type="submit" className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs px-4 py-2 rounded-lg font-bold">
                {editingMilestoneId ? 'Update' : 'Add'}
              </button>
            </form>
          )}

          {/* Horizontal Timeline list */}
          <div className="relative mt-8 overflow-x-auto pb-4">
            {project.timeline.length === 0 ? (
              <p className="text-xs text-slate-400 font-sans italic">No timeline milestones added yet.</p>
            ) : (
              <div className="flex items-start min-w-max relative pt-2 px-4">
                {/* Horizontal connecting line */}
                <div className="absolute top-5 left-24 right-24 h-0.5 bg-slate-200 z-0"></div>
                {[...project.timeline]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((m, index) => (
                  <div key={String(m.id || (m as any)._id || index)} className={`flex flex-col items-center gap-3 relative z-10 w-40 px-2 group ${isAdmin ? 'cursor-pointer' : ''}`} onClick={() => isAdmin && toggleMilestone(String(m.id || (m as any)._id))}>
                    {isAdmin && (
                      <div className="absolute top-0 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1">
                        <button onClick={(e) => handleEditClick(m, e)} className="p-1 text-slate-400 hover:text-[#00adef] bg-white rounded-full border border-slate-200 shadow-sm">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => handleDeleteClick(m, e)} className="p-1 text-slate-400 hover:text-red-500 bg-white rounded-full border border-slate-200 shadow-sm">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${m.completed ? 'bg-[#00adef] border border-[#00adef] text-white shadow-sm' : 'bg-white border-2 border-slate-300 group-hover:border-blue-500'}`}>
                      {m.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span className="text-xs font-sans font-bold text-slate-700 group-hover:text-[#00adef] transition-colors line-clamp-2 uppercase">{m.title}</span>
                      <span className="text-[10px] font-sans text-slate-400 font-medium mt-1">{m.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isAdmin ? (
            <p className="text-[10px] font-sans text-slate-400 uppercase tracking-wider font-bold mt-6">Click milestones above to toggle complete state</p>
          ) : (
            <p className="text-[10px] font-sans text-slate-400 uppercase tracking-wider font-bold mt-6">Milestones are read-only (Managed by Administrators)</p>
          )}
        </div>
      </div>

      {/* Right Metadata Card Panel */}
      <div className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6">
          {/* Status field */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-4">
            <span className="font-sans font-bold text-sm text-slate-500">Status</span>
            <span className={`px-3 py-1 text-xs font-sans font-bold rounded-full ${
              project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              project.status === 'In Progress' ? 'bg-blue-50 text-[#00adef] border border-blue-100' :
              project.status === 'On Hold' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              'bg-slate-50 text-slate-600 border border-slate-100'
            }`}>
              {project.status}
            </span>
          </div>

          {/* Start Date */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-4">
            <span className="font-sans font-bold text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Start Date
            </span>
            <span className="font-sans text-sm font-bold text-slate-800">{renderDate(project.startDate)}</span>
          </div>

          {/* End Date */}
          <div className="flex justify-between items-center border-b border-slate-50 pb-4">
            <span className="font-sans font-bold text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> End Date
            </span>
            <span className="font-sans text-sm font-bold text-slate-800">{renderDate(project.endDate)}</span>
          </div>

          {/* Manager info */}
          <div className="flex justify-between items-center">
            <span className="font-sans font-bold text-sm text-slate-500 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Manager
            </span>
            {(!project.manager || project.manager.toLowerCase() === 'unassigned' || project.manager.toLowerCase() === 'no') ? (
              <span className="font-sans text-sm font-bold text-slate-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center font-bold text-[10px] text-slate-400 border border-slate-100">
                  <UserMinus className="w-3.5 h-3.5" />
                </span>
                Not Assigned
              </span>
            ) : (
              <span className="font-sans text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 border border-slate-200">
                  {project.manager.substring(0, 2).toUpperCase()}
                </span>
                {project.manager}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
