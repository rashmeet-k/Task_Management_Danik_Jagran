import { ConfirmModal } from './ConfirmModal';
import React, { useState, useEffect } from 'react';
import { Task, User } from '../types';
import { Search, Plus, Edit2, Trash2, Calendar, UserCheck, UserMinus, ChevronDown } from 'lucide-react';
import { TaskPopup } from './TaskPopup';

interface TasksTabProps {
  projectId: string;
  projectName: string;
  token: string | null;
  role: string | undefined;
}

const formatDueDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export const TasksTab: React.FC<TasksTabProps> = ({ projectId, projectName, token, role }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Task creation fields
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('Medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setTasks(Array.isArray(data) ? data : (Array.isArray(data?.tasks) ? data.tasks : []));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
      setTasks([]);
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

  
  const handleEditClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setNewName(task.name);
    setNewDesc(task.description);
    setNewAssigneeId(task.assigneeId || '');
    setNewPriority(task.priority || 'Medium');
    setNewDueDate(task.dueDate || '');
    setEditingTaskId(task.id);
    setShowCreateForm(true);
  };

  
  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewAssigneeId('');
    setNewPriority('Medium');
    setShowCreateForm(false);
    setEditingTaskId(null);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) return;

    if (editingTaskId) {
      try {
        const res = await fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newName,
            description: newDesc,
            assigneeId: newAssigneeId,
            priority: newPriority,
            dueDate: newDueDate
          })
        });
        if (res.ok) {
          const updated = await res.json().catch(() => ({}));
          setTasks(tasks.map(t => t.id === editingTaskId ? updated : t));
          resetForm();
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          name: newName,
          description: newDesc,
          assigneeId: newAssigneeId,
          priority: newPriority,
          dueDate: newDueDate,
          status: 'To Do',
          progress: 0
        })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setTasks([...tasks, data]);
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (taskId) {
      setTaskToDelete(taskId);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const idToRemove = taskToDelete;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${idToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(prev => prev.filter((t) => t.id !== idToRemove && (t as any)._id !== idToRemove && String((t as any)._id) !== idToRemove));
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Failed to delete task');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setTaskToDelete(null);
      fetchTasks();
    }
  };

  const handleTaskUpdateFromPopup = (updatedTask: Task) => {
    setTasks((prev) => (Array.isArray(prev) ? prev : []).map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const safeTasks = Array.isArray(tasks) ? [...tasks].reverse() : [];
  const filtered = safeTasks.filter((t) => (t.name || '').toLowerCase().includes(search.toLowerCase()));

  const canManage = role === 'Admin' || role === 'Project Manager';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      {/* Header filter and Add Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search task name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowCreateForm(true); }}
            className="flex items-center justify-center gap-2 bg-[#00adef] hover:bg-sky-500 text-white text-xs font-sans font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      {/* Task Creation Inline Form overlay */}
      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-4 animate-fadeIn">
          <h3 className="font-sans font-bold text-sm text-slate-700">{editingTaskId ? "Edit Task" : "Create New Task"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Task Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Conduct prototype reviews"
                className="bg-white border border-slate-200 outline-none p-2.5 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Assign Member</label>
              <div className="relative">
                <div 
                  className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-sans text-slate-800 cursor-pointer flex justify-between items-center focus:border-blue-500 focus:bg-white transition-colors"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                >
                  <span className="truncate">{users.find(u => u.id.toString() === newAssigneeId)?.name || 'Select Member'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                </div>
                {showAssigneeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        placeholder="Search Name..." 
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto">
                      <div 
                        className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-600"
                        onClick={() => { setNewAssigneeId(''); setShowAssigneeDropdown(false); }}
                      >
                        Select Member
                      </div>
                      {users
                        .filter(u => (u.name || '').toLowerCase().includes(assigneeSearch.toLowerCase()))
                        .map((u) => (
                        <div 
                          key={u.id} 
                          className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-800 flex justify-between items-center"
                          onClick={() => { setNewAssigneeId(u.id.toString()); setShowAssigneeDropdown(false); setAssigneeSearch(''); }}
                        >
                          <span className="font-bold truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Description</label>
            <textarea
              required
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Detailed tasks expectations, constraints, and instructions..."
              className="bg-white border border-slate-200 outline-none p-2.5 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
                className="bg-white border border-slate-200 outline-none p-2.5 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Due Date</label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="bg-white border border-slate-200 outline-none p-2.5 rounded-lg text-xs font-sans text-slate-800 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={resetForm}
              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-sans text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
            >
              {editingTaskId ? "Save Task" : "Add Task"}
            </button>
          </div>
        </form>
      )}

      {/* Task table / grid layout exactly like Page 7 */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tl-xl w-[10%] hidden sm:table-cell">Task ID</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[25%]">Task Name</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[20%] hidden md:table-cell">Assigned To</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[10%] hidden sm:table-cell">Priority</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[12%] hidden lg:table-cell">Due Date</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%]">Progress</th>
              <th className="py-3 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-center rounded-tr-xl w-[8%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-sans bg-white">No tasks matching search found.</td>
              </tr>
            ) : (
              filtered.map((task) => {
                const assigneeUser = users.find((u) => u.name === task.assignee);
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-all bg-white"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] sm:text-xs text-slate-500 font-bold hidden sm:table-cell">
                      {task.id ? (task.id.length > 5 ? `TSK-${task.id.slice(-4).toUpperCase()}` : `TSK-${task.id.padStart(3, '0')}`) : 'TSK-N/A'}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-[10px] sm:text-xs text-slate-800 truncate">{task.name}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {(!task.assignee || task.assignee.toLowerCase() === 'unassigned' || task.assignee.toLowerCase() === 'no') ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                              <UserMinus className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-sans font-medium text-xs text-slate-400">Not Assigned</span>
                          </>
                        ) : (
                          <>
                            <img
                              src={assigneeUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt={task.assignee}
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded-full object-cover border border-slate-100"
                            />
                            <span className="font-sans font-medium text-xs text-slate-600">{task.assignee}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-sans font-bold shadow-2xs text-white ${
                        task.priority === 'Critical' ? 'bg-rose-600 border border-rose-700' :
                        task.priority === 'High' ? 'bg-amber-500 border border-amber-600' :
                        task.priority === 'Medium' ? 'bg-[#0f3278] border border-blue-900' :
                        'bg-slate-600 border border-slate-700'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium hidden lg:table-cell">{formatDueDate(task.dueDate)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 w-24 sm:w-28">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              task.status === 'Completed' ? 'bg-emerald-500' :
                              task.status === 'Review' ? 'bg-[#00adef]' :
                              task.status === 'In Progress' ? 'bg-amber-500' :
                              'bg-slate-300'
                            }`}
                            style={{ width: `${task.status === 'Completed' ? 100 : task.status === 'Review' ? 75 : task.status === 'In Progress' ? 50 : 0}%` }}
                          />
                        </div>
                        <span className="font-sans text-[11px] text-slate-700 font-bold shrink-0">{task.status === 'Completed' ? 100 : task.status === 'Review' ? 75 : task.status === 'In Progress' ? 50 : 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleEditClick(e, task)}
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded transition-colors"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTaskClick(e, task.id || (task as any)._id)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-sans text-slate-400 font-medium italic">View details</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Popup Overlay for Detailed Comment/Attachment interactions */}
      {selectedTask && (
        <TaskPopup
          taskId={selectedTask.id}
          projectId={projectId}
          projectName={projectName}
          token={token}
          onClose={() => { setSelectedTask(null); fetchTasks(); }}
          onUpdateTask={handleTaskUpdateFromPopup}
        />
      )}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This will permanently remove the data."
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
