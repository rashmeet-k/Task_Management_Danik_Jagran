import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Project, User } from '../types';
import { Search, Plus, Filter, ArrowUpDown, Edit2, Trash2, UserMinus, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';


const renderDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
};

export const Projects: React.FC = () => {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'progress' | 'startDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Create Project Overlay Fields
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newManagerId, setNewManagerId] = useState('');
  const [newPriority, setNewPriority] = useState<Project['priority']>('Medium');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (parts[0].length === 4 && parts[2].length === 2) {
        return dateStr;
      }
    }
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return '';
    const tzOffset = parsed.getTimezoneOffset() * 60000;
    return (new Date(parsed.getTime() - tzOffset)).toISOString().slice(0, 10);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    const tzOffset = parsed.getTimezoneOffset() * 60000;
    const localDate = new Date(parsed.getTime() + tzOffset);
    const day = localDate.getDate().toString().padStart(2, '0');
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewManagerId('');
    setNewPriority('Medium');
    setNewStartDate('');
    setNewEndDate('');
    setEditingProjectId(null);
    setShowCreateForm(false);
  };

  const handleEditClick = (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setNewName(proj.name);
    setNewDesc(proj.description || '');
    setNewManagerId(proj.managerId || '');
    setNewPriority(proj.priority || 'Medium');
    setNewStartDate(formatDateForInput(proj.startDate || ''));
    setNewEndDate(formatDateForInput(proj.endDate || ''));
    setShowCreateForm(true);
  };

  const handleDeleteProjectClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(id);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== targetId && (p as any)._id !== targetId));
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
      fetchProjects();
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setProjects(Array.isArray(data) ? data : (Array.isArray(data?.projects) ? data.projects : []));
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setUsers(Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []));
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim() || !newDesc.trim()) {
      setFormError('Project name and description are required.');
      return;
    }

    if (newName.trim().length < 3) {
      setFormError('Project name must be at least 3 characters.');
      return;
    }

    if (newDesc.trim().length < 10) {
      setFormError('Project description must be at least 10 characters.');
      return;
    }

    if (!newStartDate || !newEndDate) {
      setFormError('Start Date and Due Date are required.');
      return;
    }

    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!editingProjectId && start < today) {
      setFormError('Start date cannot be in the past.');
      return;
    }

    if (end <= start) {
      setFormError('End date must be after the start date.');
      return;
    }

    const url = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
    const method = editingProjectId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          managerId: newManagerId,
          priority: newPriority,
          startDate: formatDateForDisplay(newStartDate),
          endDate: formatDateForDisplay(newEndDate),
          ...(editingProjectId ? {} : { status: 'Planning' })
        })
      });

      if (res.ok) {
        const saved = await res.json().catch(() => ({}));
        if (editingProjectId) {
          setProjects(projects.map(p => p.id === editingProjectId ? saved : p));
        } else {
          setProjects([...projects, saved]);
        }
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSort = (field: 'name' | 'progress' | 'startDate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const sortedProjects = [...safeProjects]
    .filter((p) => (p.name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'progress') {
        comparison = (a.progress || 0) - (b.progress || 0);
      } else if (sortField === 'startDate') {
        comparison = (a.startDate || '').localeCompare(b.startDate || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const canManage = user?.role === 'Admin' || user?.role === 'Project Manager';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Page Title & Sub-header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-slate-800 leading-none">PROJECT OVERVIEW</h1>
          <p className="font-sans text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">Manage and track all ongoing newsroom projects.</p>
        </div>
        
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowCreateForm(!showCreateForm); }}
            className="flex items-center gap-1.5 bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-3 py-2.5 rounded-lg shadow-md transition-all self-start"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        )}
      </div>

      {/* Project Creation Inline Form overlay */}
      {showCreateForm && (
        <form onSubmit={handleSaveProject} className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col gap-4 animate-fadeIn shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-sans font-bold text-base text-slate-800">{editingProjectId ? 'Edit Project' : 'Create New Project'}</h3>
            {formError && <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">{formError}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Project Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Election Coverage Portal"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Assign Project Manager</label>
              <div className="relative">
                <div 
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-sans text-slate-800 cursor-pointer flex justify-between items-center focus:border-blue-500 focus:bg-white transition-colors"
                  onClick={() => setShowManagerDropdown(!showManagerDropdown)}
                >
                  <span>{safeUsers.find(u => u.id.toString() === newManagerId)?.name || 'Select Manager'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
                {showManagerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        placeholder="Search ID or Name..." 
                        value={managerSearch}
                        onChange={(e) => setManagerSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto">
                      <div 
                        className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-600"
                        onClick={() => { setNewManagerId(''); setShowManagerDropdown(false); }}
                      >
                        Select Manager
                      </div>
                      {safeUsers
                        .filter(u => u.role === 'Project Manager')
                        .filter(u => {
                          const formattedId = u.empId || (u.id ? (u.id.length > 5 ? `EMP-${u.id.slice(-4).toUpperCase()}` : `EMP-${u.id.padStart(3, '0')}`) : 'EMP-N/A');
                          return (u.name || '').toLowerCase().includes(managerSearch.toLowerCase()) || 
                                 formattedId.toLowerCase().includes(managerSearch.toLowerCase());
                        })
                        .map((u) => (
                        <div 
                          key={u.id} 
                          className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-800 flex justify-between items-center"
                          onClick={() => { setNewManagerId(u.id.toString()); setShowManagerDropdown(false); setManagerSearch(''); }}
                        >
                          <span className="font-bold truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">ID: {u.empId || (u.id ? (u.id.length > 5 ? `EMP-${u.id.slice(-4).toUpperCase()}` : `EMP-${u.id.padStart(3, '0')}`) : 'EMP-N/A')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Project Description</label>
            <textarea
              required
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide summary and expectations of this project..."
              className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Project['priority'])}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Start Date</label>
              <input
                type="date"
                required
                min={!editingProjectId ? new Date().toISOString().slice(0, 10) : undefined}
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Due Date</label>
              <input
                type="date"
                required
                min={newStartDate || (!editingProjectId ? new Date().toISOString().slice(0, 10) : undefined)}
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={resetForm}
              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-sans text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-3 py-2 rounded-lg shadow-md transition-all"
            >
              {editingProjectId ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </form>
      )}

      {/* Main Filter / Sort Controls Panel */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search project name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => handleSort('progress')}
            className={`flex items-center gap-1 text-xs font-sans font-bold px-3 py-2 border rounded-lg transition-all ${
              sortField === 'progress' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" /> Progress
          </button>
          <button
            onClick={() => handleSort('name')}
            className={`flex items-center gap-1 text-xs font-sans font-bold px-3 py-2 border rounded-lg transition-all ${
              sortField === 'name' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" /> Project Name
          </button>
        </div>
      </div>

      {/* Project Overview Table - EXACTLY like Page 4 layout */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tl-2xl w-[12%]">Project ID</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[25%]">Project Name</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden sm:table-cell">Progress</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden md:table-cell">Start Date</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden md:table-cell">Due Date</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[18%] hidden sm:table-cell">Manager</th>
              {user?.role === 'Admin' && <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tr-2xl text-right w-[15%] sm:w-[10%]">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 7 : 6} className="py-12 text-center text-xs text-slate-400 bg-white">Loading projects...</td>
              </tr>
            ) : sortedProjects.length === 0 ? (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 7 : 6} className="py-12 text-center text-xs text-slate-400 bg-white">No projects found.</td>
              </tr>
            ) : (
              sortedProjects.map((proj) => (
                <tr
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-all bg-white"
                >
                  <td className="py-4 px-4 font-mono text-[10px] sm:text-xs text-slate-500 font-bold truncate">
                    {proj.teamId || (proj.id ? (proj.id.length > 5 ? `PRJ-${proj.id.slice(-4).toUpperCase()}` : `PRJ-${proj.id.padStart(3, '0')}`) : 'PRJ-N/A')}
                  </td>
                  <td className="py-4 px-4 font-sans font-black text-[10px] sm:text-xs text-slate-800 tracking-tight"><div className="line-clamp-2">{(proj.name || '').toUpperCase()}</div></td>
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            proj.progress >= 100 ? 'bg-emerald-500' :
                            proj.progress >= 60 ? 'bg-[#00adef]' :
                            proj.progress >= 30 ? 'bg-amber-500' :
                            'bg-slate-300'
                          }`}
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <span className="font-sans text-[11px] font-black text-slate-700">{proj.progress}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden md:table-cell">{renderDate(proj.startDate)}</td>
                  <td className="py-4 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden md:table-cell">{renderDate(proj.endDate)}</td>
                  <td className="py-4 px-4 font-sans text-[10px] sm:text-xs truncate hidden sm:table-cell">
                    {(!proj.manager || proj.manager.toLowerCase() === 'unassigned' || proj.manager.toLowerCase() === 'no') ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-400 font-medium border border-slate-100">
                        <UserMinus className="w-3.5 h-3.5" />
                        Unassigned
                      </span>
                    ) : (
                      <span className="font-bold text-slate-700">{proj.manager}</span>
                    )}
                  </td>
                  {user?.role === 'Admin' && (
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => handleEditClick(proj, e)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProjectClick(proj.id, e)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-sans font-black text-slate-400 text-center uppercase tracking-widest mt-2">Click on any project row above to view full details &amp; tabs</p>
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone and will also delete all associated tasks, documents, and annexures."
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
