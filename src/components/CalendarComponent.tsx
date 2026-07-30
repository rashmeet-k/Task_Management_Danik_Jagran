import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Check, 
  Clock, 
  User as UserIcon, 
  Tag, 
  X,
  AlertCircle
, ChevronDown } from 'lucide-react';
import { Task, User, Project } from '../types';
import { TaskPopup } from './TaskPopup';
import { useAuth } from '../context/AuthContext';

interface CalendarComponentProps {
  projectId?: string;
  projectName?: string;
  token?: string | null;
  role?: string;
}

export const CalendarComponent: React.FC<CalendarComponentProps> = ({
  projectId,
  projectName,
  token: propToken,
  role
}) => {
  const { token: contextToken } = useAuth();
  const token = propToken || contextToken;

  const [currentDate, setCurrentDate] = useState<Date>(new Date()); // Default to July 2026
  const [viewMode, setViewMode] = useState<'Week View' | 'Month View' | 'Day View'>('Week View');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Selected Task for Details Popup
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskProject, setSelectedTaskProject] = useState<{ id: string; name: string }>({
    id: projectId || '',
    name: projectName || 'Project'
  });

  // Task Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDateStr, setCreateDateStr] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Medium');
  const [newTaskProjectId, setNewTaskProjectId] = useState(projectId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    if (!projectId) {
      fetchProjects();
    }
  }, [projectId, token]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = projectId ? `/api/projects/${projectId}/tasks` : '/api/tasks';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setTasks(Array.isArray(data) ? data : (Array.isArray(data?.tasks) ? data.tasks : []));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching calendar tasks:', err);
      setTasks([]);
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
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

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
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  // Helper to normalize task dueDate strings into YYYY-MM-DD accurately
  const formatTaskDateKey = (dateStr: string): string => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();

    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const MONTH_MAP: Record<string, string> = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12'
    };

    const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const mName = dmyMatch[2].toLowerCase();
      const month = MONTH_MAP[mName];
      const year = dmyMatch[3];
      if (month) return `${year}-${month}-${day}`;
    }

    const mdyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (mdyMatch) {
      const mName = mdyMatch[1].toLowerCase();
      const month = MONTH_MAP[mName];
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

    return trimmed;
  };

  // Format JS Date into YYYY-MM-DD
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtered tasks based on status, priority, and search
  const filteredTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter((task) => {
      if (statusFilter !== 'All' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim() && !task.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(task.description || '').toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Group tasks by Date Key YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      const dateKey = formatTaskDateKey(task.dueDate);
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Week View') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'Month View') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Week View') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'Month View') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date()); // Jump to current date
  };

  // Week days calculation (Sunday through Saturday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon...
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        dateObj: d,
        dateKey: formatDateKey(d),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday
      });
    }
    return days;
  }, [currentDate]);

  // Month days matrix calculation
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const matrix = [];
    const today = new Date();

    for (let row = 0; row < 5; row++) {
      const week = [];
      for (let col = 0; col < 7; col++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + (row * 7 + col));
        const isCurrentMonth = d.getMonth() === month;
        const isToday = d.toDateString() === today.toDateString();
        week.push({
          dateObj: d,
          dateKey: formatDateKey(d),
          dayNum: d.getDate(),
          isCurrentMonth,
          isToday
        });
      }
      matrix.push(week);
    }
    return matrix;
  }, [currentDate]);

  // Dynamic Date Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === 'Week View') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.monthShort} ${start.dayNum} - ${end.monthShort} ${end.dayNum}, ${end.dateObj.getFullYear()}`;
    } else if (viewMode === 'Month View') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
  }, [viewMode, weekDays, currentDate]);

  // Handle open task details
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    let pName = projectName;
    if (!pName && task.projectId) {
      const foundP = projects.find((p) => p.id === task.projectId);
      if (foundP) pName = foundP.name;
    }
    setSelectedTaskProject({
      id: task.projectId || projectId || '',
      name: pName || 'Project'
    });
  };

  // Open Create Task Modal for specific date
  const openCreateTaskForDate = (dateKeyStr?: string) => {
    const initialDate = dateKeyStr || formatDateKey(currentDate);
    setCreateDateStr(initialDate);
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskAssigneeId('');
    setNewTaskPriority('Medium');
    setNewTaskProjectId(projectId || (projects[0]?.id || ''));
    setShowCreateModal(true);
  };

  // Submit new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !createDateStr) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: newTaskProjectId || projectId,
          name: newTaskName,
          description: newTaskDesc,
          assigneeId: newTaskAssigneeId,
          priority: newTaskPriority,
          dueDate: createDateStr,
          status: 'To Do',
          progress: 0
        })
      });

      if (res.ok) {
        const newTask = await res.json().catch(() => ({}));
        setTasks((prev) => [...prev, newTask]);
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle task updated from TaskPopup
  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
  };

  // Badge Color Mapper for Priority
  const getPriorityStyle = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Medium':
        return 'bg-sky-100 text-sky-700 border-sky-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Status Badge Mapper
  const getStatusBadgeStyle = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Review':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6">
      
      {/* Calendar Header Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
        
        {/* Left: Date navigation & range */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleToday}
            className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            Today
          </button>
          
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white p-1">
            <button 
              onClick={handlePrev}
              title="Previous"
              className="p-1 hover:bg-slate-50 text-slate-600 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNext}
              title="Next"
              className="p-1 hover:bg-slate-50 text-slate-600 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="font-sans font-black text-sm text-slate-800 tracking-tight">
            {headerTitle}
          </span>
        </div>

        {/* Right: Search, View selector, Filters, Add Task button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Quick Search */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#00adef]">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-700 w-28 sm:w-36 font-sans"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* View Mode Selector */}
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-white border border-slate-200 outline-none px-3 py-1.5 rounded-lg text-xs font-sans text-slate-700 font-bold hover:border-slate-300 transition-colors"
          >
            <option value="Week View">Week View</option>
            <option value="Month View">Month View</option>
            <option value="Day View">Day View</option>
          </select>

          {/* Filter Dropdown Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-1.5 bg-white border rounded-lg px-3 py-1.5 text-xs font-sans font-bold transition-all ${
                statusFilter !== 'All' || priorityFilter !== 'All'
                  ? 'border-[#00adef] text-[#00adef] bg-sky-50/50'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {(statusFilter !== 'All' || priorityFilter !== 'All') && (
                <span className="w-2 h-2 rounded-full bg-[#00adef]" />
              )}
            </button>

            {/* Filter Menu Popover */}
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 flex flex-col gap-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-sans font-bold text-xs text-slate-700">Filter Tasks</span>
                  <button onClick={() => setShowFilterMenu(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-sans font-bold text-slate-400 uppercase">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-sans outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-sans font-bold text-slate-400 uppercase">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-sans outline-none"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {(statusFilter !== 'All' || priorityFilter !== 'All') && (
                  <button
                    onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }}
                    className="text-[11px] font-sans font-bold text-[#00adef] hover:underline self-end mt-1"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>



        </div>
      </div>

      {/* Main Calendar View Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-[#00adef] border-t-transparent rounded-full animate-spin" />
          <span className="font-sans text-xs text-slate-400 font-bold uppercase tracking-wider">Loading schedule & tasks...</span>
        </div>
      ) : (
        <>
          {/* ==================== WEEK VIEW ==================== */}
          {viewMode === 'Week View' && (
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs flex flex-col">
              
              {/* Days Header Row */}
              <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-100 py-3 text-center">
                <div className="font-mono text-[10px] font-bold text-slate-400 self-center uppercase">Time</div>
                {weekDays.map((d) => (
                  <div 
                    key={d.dateKey} 
                    className="flex flex-col items-center"
                  >
                    <span className="font-sans text-[11px] font-bold text-slate-400 uppercase leading-none mb-1">
                      {d.dayName}
                    </span>
                    <span className={`w-7 h-7 rounded-full font-sans text-xs font-black flex items-center justify-center transition-all ${
                      d.isToday ? 'bg-[#00adef] text-white shadow-md' : 'text-slate-700'
                    }`}>
                      {d.dayNum}
                    </span>
                  </div>
                ))}
              </div>

              {/* All-Day / Due Tasks Banner Row */}
              <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/40 min-h-[50px]">
                <div className="font-mono text-[10px] font-bold text-slate-400 p-2.5 text-center border-r border-slate-100 flex items-center justify-center bg-slate-50">
                  TASKS DUE
                </div>
                {weekDays.map((d) => {
                  const dayTasks = tasksByDate[d.dateKey] || [];
                  return (
                    <div key={d.dateKey} className="border-r border-slate-100 p-1.5 flex flex-col gap-1 min-h-[50px]">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={`p-1.5 rounded-lg text-[10px] font-sans font-bold leading-tight shadow-2xs border cursor-pointer hover:scale-[1.02] transition-all flex flex-col gap-1 overflow-hidden ${getPriorityStyle(task.priority)}`}
                        >
                          <div className="flex items-start justify-between gap-1 w-full min-w-0">
                            <span className="truncate flex-1">{task.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] opacity-80 w-full min-w-0 gap-1">
                            <span className="truncate flex-1">{task.assignee ? task.assignee.split(' ')[0] : 'Unassigned'}</span>
                            <span className="font-mono text-[8px] uppercase font-black shrink-0">{task.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>



            </div>
          )}

          {/* ==================== MONTH VIEW ==================== */}
          {viewMode === 'Month View' && (
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs flex flex-col">
              
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100 py-2.5 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <span key={d} className="font-sans text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {d}
                  </span>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/30">
                {monthMatrix.flatMap((week) => week).map((cell) => {
                  const dayTasks = tasksByDate[cell.dateKey] || [];
                  return (
                    <div
                      key={cell.dateKey}
                      className={`min-h-[100px] p-2 bg-white flex flex-col justify-between transition-colors hover:bg-slate-50/80 group ${
                        !cell.isCurrentMonth ? 'opacity-40 bg-slate-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`w-6 h-6 rounded-full font-sans text-xs font-black flex items-center justify-center ${
                          cell.isToday ? 'bg-[#00adef] text-white shadow-sm' : 'text-slate-700'
                        }`}>
                          {cell.dayNum}
                        </span>
                      </div>

                      {/* Day Tasks List */}
                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[70px] pr-0.5 custom-scrollbar">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className={`px-1.5 py-1 rounded-[4px] text-[10px] font-sans font-semibold border shadow-xs cursor-pointer hover:scale-[1.02] transition-transform flex items-center gap-1 ${getPriorityStyle(task.priority)}`}
                            title={`${task.name} - ${task.assignee} (${task.status})`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0"></div>
                            <span className="truncate flex-1">{task.name}</span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <span 
                            className="text-[9px] font-sans font-bold text-slate-400 pl-1 hover:text-slate-600 cursor-pointer"
                          >
                            +{dayTasks.length - 3} more tasks
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ==================== DAY VIEW ==================== */}
          {viewMode === 'Day View' && (
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Timeline & Hour Slots */}
              <div className="flex-1 border border-slate-100 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#00adef]" />
                    <span className="font-sans font-bold text-xs text-slate-700 uppercase tracking-wider">
                      Schedule for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[420px]">
                  {(() => {
                    const activeKey = formatDateKey(currentDate);
                    const dayTasks = tasksByDate[activeKey] || [];
                    if (dayTasks.length === 0) {
                      return <div className="py-8 text-center text-xs text-slate-400 font-sans italic">No tasks scheduled for this date.</div>;
                    }
                    return dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleTaskClick(t)}
                        className={`p-3 rounded-xl text-xs font-sans font-bold border shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.01] transition-transform ${getPriorityStyle(t.priority)}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{t.name}</span>
                          <span className="text-[10px] font-normal opacity-80">{t.description || 'No description provided.'}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadgeStyle(t.status)}`}>
                            {t.status}
                          </span>
                          <span className="text-[10px] font-medium opacity-80 text-right">{t.assignee || 'Unassigned'}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Right Column: Tasks Due Today Summary Panel */}
              <div className="w-full md:w-80 bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-sans font-black text-xs text-slate-700 uppercase tracking-wider">
                    Tasks Due Today ({tasksByDate[formatDateKey(currentDate)]?.length || 0})
                  </h3>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[450px]">
                  {(tasksByDate[formatDateKey(currentDate)] || []).length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-sans italic">
                      No tasks due on this date.
                    </div>
                  ) : (
                    (tasksByDate[formatDateKey(currentDate)] || []).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleTaskClick(t)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-sans font-bold text-xs text-slate-800">{t.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getPriorityStyle(t.priority)}`}>
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="font-sans text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-50">
                          <span className="font-medium">{t.assignee || 'Unassigned'}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold border ${getStatusBadgeStyle(t.status)}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* Task Creation Modal overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#00adef]" />
                <h3 className="font-sans font-bold text-sm text-slate-800">Add Task on {createDateStr}</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Task Name *</label>
                <input
                  type="text"
                  required
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g. Prepare editorial review draft"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-sans outline-none focus:border-[#00adef] focus:bg-white transition-all"
                />
              </div>

              {!projectId && projects.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Project</label>
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-sans outline-none focus:border-[#00adef]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Assignee</label>
                  <div className="relative">
                    <div 
                      className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-sans text-slate-800 cursor-pointer flex justify-between items-center focus:border-[#00adef] transition-colors"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    >
                      <span className="truncate">{users.find(u => u.id.toString() === newTaskAssigneeId)?.name || 'Select Member'}</span>
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
                            className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-lg text-xs font-sans text-slate-800 focus:border-[#00adef]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="overflow-y-auto">
                          <div 
                            className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-600"
                            onClick={() => { setNewTaskAssigneeId(''); setShowAssigneeDropdown(false); }}
                          >
                            Select Member
                          </div>
                          {users
                            .filter(u => (u.name || '').toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .map((u) => (
                            <div 
                              key={u.id} 
                              className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-sans text-slate-800 flex justify-between items-center"
                              onClick={() => { setNewTaskAssigneeId(u.id.toString()); setShowAssigneeDropdown(false); setAssigneeSearch(''); }}
                            >
                              <span className="font-bold truncate">{u.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-sans outline-none focus:border-[#00adef]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Due Date</label>
                <input
                  type="date"
                  required
                  value={createDateStr}
                  onChange={(e) => setCreateDateStr(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-sans outline-none focus:border-[#00adef]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Task instructions and guidelines..."
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-sans outline-none focus:border-[#00adef] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Popup overlay */}
      {selectedTaskId && (
        <TaskPopup
          taskId={selectedTaskId}
          projectId={selectedTaskProject.id}
          projectName={selectedTaskProject.name}
          token={token}
          onClose={() => {
            setSelectedTaskId(null);
            fetchTasks(); // Re-sync tasks when modal closes
          }}
          onUpdateTask={handleTaskUpdated}
        />
      )}

    </div>
  );
};
