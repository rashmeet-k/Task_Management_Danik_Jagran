import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Milestone, RecentActivity } from '../types';
import { Users, FolderClosed, CheckSquare, Clock, AlertTriangle, ChevronRight, User } from 'lucide-react';
import { formatTimeAgo } from '../lib/formatTime';
import { LiveTime } from '../components/LiveTime';
import { ConfirmModal } from '../components/ConfirmModal';
import { Trash2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearActivityModal, setShowClearActivityModal] = useState(false);
  const [isClearingActivity, setIsClearingActivity] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchMilestones();
    fetchActivities();
    
    const interval = setInterval(() => {
      fetchStats(false);
      fetchMilestones();
      fetchActivities();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClearActivity = async () => {
    setIsClearingActivity(true);
    try {
      const res = await fetch('/api/recent-activities', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActivities([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearingActivity(false);
      setShowClearActivityModal(false);
    }
  };

  const fetchStats = async (showLoading = true) => {
    if (showLoading && !stats) setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await fetch('/api/milestones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setMilestones(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/recent-activities', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setActivities(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#00adef] border-t-transparent animate-spin" />
          <span className="font-sans text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing database data...</span>
        </div>
      </div>
    );
  }

  // Bar Chart Data mapping
  const chartData = [
    { name: 'In progress', count: stats.projectStatusDistribution.inProgress },
    { name: 'Pending', count: stats.projectStatusDistribution.pending },
    { name: 'Review', count: stats.projectStatusDistribution.review || 0 }, 
    { name: 'Completed', count: stats.projectStatusDistribution.completed }
  ];

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      
      {/* Date & Greeting Header Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">{currentDateStr}</span>
        <h1 className="font-sans font-black text-3xl sm:text-4xl tracking-tight text-slate-800 leading-none">
          Welcome Back, {user?.name ? user.name.split(' ')[0] : 'User'}!
        </h1>
      </div>

      {/* Metrics Cards Row */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${user?.role === 'Admin' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {/* TOTAL USERS Card (Visible ONLY to Admin) */}
        {user?.role === 'Admin' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">TOTAL USERS</span>
              <span className="font-sans font-black text-3xl text-slate-800 tracking-tight leading-none">{stats.stats.totalUsers || 0}</span>
            </div>
            <span className="text-[11px] font-sans text-slate-500 font-medium">{stats.stats.activeUsers || 0} Active Users</span>
          </div>
        )}

        {/* TOTAL PROJECTS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {user?.role === 'Team Member' ? 'MY PROJECTS' : 'TOTAL PROJECTS'}
            </span>
            <span className="font-sans font-black text-3xl text-slate-800 tracking-tight leading-none">{stats.stats.totalProjects}</span>
          </div>
          <span className="text-[11px] font-sans text-slate-500 font-medium">{stats.stats.activeProjects || 0} Active</span>
        </div>

        {/* TOTAL TASKS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {user?.role === 'Team Member' ? 'MY ASSIGNED TASKS' : 'TOTAL TASKS'}
            </span>
            <span className="font-sans font-black text-3xl text-slate-800 tracking-tight leading-none">{stats.stats.totalTasks}</span>
          </div>
          <span className="text-[11px] font-sans text-slate-500 font-medium">{stats.stats.completedTasks || 0} completed</span>
        </div>

        {/* PENDING TASKS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">PENDING TASKS</span>
            <span className="font-sans font-black text-3xl text-slate-800 tracking-tight leading-none">{stats.stats.pendingTasks}</span>
          </div>
          <span className="text-[11px] font-sans text-slate-500 font-medium">{stats.stats.pendingTasks} tasks pending</span>
        </div>

        {/* OVERDUE TASKS Card */}
        <div className="bg-cyan-500 p-5 rounded-2xl border border-cyan-600 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-sans font-bold text-white uppercase tracking-wider block mb-1">OVERDUE TASKS</span>
            <span className="font-sans font-black text-3xl text-white tracking-tight leading-none">{stats.stats.overdueTasks || 0}</span>
          </div>
          <span className="text-[11px] font-sans text-cyan-100 font-bold uppercase tracking-wider">Needs Attention</span>
        </div>
      </div>

      {/* Middle row: Bar Chart & Milestones (& Recent Activity if visible) */}
      <div className={`grid grid-cols-1 ${user?.role === 'Team Member' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        
        {/* Recent Activity timeline (Hidden for Team Members) */}
        {user?.role !== 'Team Member' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col ">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-sans font-bold text-sm text-slate-500 uppercase tracking-wider">RECENT ACTIVITY</h2>
              {user?.role === 'Admin' && activities.length > 0 && (
                <button 
                  onClick={() => setShowClearActivityModal(true)}
                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-sans text-[10px] font-bold px-2 py-1 rounded transition-colors border border-red-100"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto max-h-64">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 font-sans italic p-4 text-center">No recent activity found.</p>
              ) : (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-3 items-start border-b border-slate-50 pb-3">
                    {act.userAvatar ? (
                      <img
                        src={act.userAvatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-slate-100 mt-0.5"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <p className="font-sans text-xs text-slate-700">
                        <span className="font-bold text-slate-800">{act.userName}</span> {act.action} <span className="font-bold text-slate-800">{act.entityName}</span>
                      </p>
                      <span className="font-sans text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <LiveTime time={act.timestamp} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Project Status Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col ">
          <h2 className="font-sans font-bold text-sm text-slate-500 uppercase tracking-wider mb-6">PROJECT STATUS</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" interval={0} tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'sans-serif', fontWeight: 'bold' }}  />
                <YAxis  tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip cursor={false} />
                <Bar activeBar={false} dataKey="count" fill="#00adef" radius={[8, 8, 0, 0]} barSize={40} onClick={() => navigate('/projects')} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col ">
          <h2 className="font-sans font-bold text-sm text-slate-500 uppercase tracking-wider mb-6">UPCOMING MILESTONES</h2>
          
          <div className="flex flex-col gap-4 overflow-y-auto max-h-64">
            {milestones.length === 0 ? (
              <p className="text-xs text-slate-400 font-sans italic p-4 text-center">No upcoming milestones.</p>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="flex gap-3 items-start border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-sans font-bold text-[10px] text-slate-600 border border-slate-200">
                    {(m.lead || 'UN').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span 
                      onClick={() => navigate(`/projects/${m.projectId}`)}
                      className="font-sans font-bold text-xs text-slate-800 hover:text-[#00adef] cursor-pointer"
                    >
                      {m.name}
                    </span>
                    <span className="font-sans text-[10px] text-slate-400">{(m.lead && m.lead.toLowerCase() !== 'unassigned' && m.lead.toLowerCase() !== 'no') ? `lead by ${m.lead}` : 'Lead Not Assigned'} &bull; {m.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <ConfirmModal
        isOpen={showClearActivityModal}
        title="Clear Recent Activity"
        message="Are you sure you want to clear the global activity log? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={handleClearActivity}
        onCancel={() => setShowClearActivityModal(false)}
        isDestructive={true}
        isLoading={isClearingActivity}
      />
    </div>
  );
};
