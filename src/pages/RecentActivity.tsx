import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RecentActivity } from '../types';
import { Search, Calendar, User, Clock } from 'lucide-react';
import { formatTimeAgo } from '../lib/formatTime';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const RecentActivityPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => {
      fetchActivities(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearActivity = async () => {
    setIsClearing(true);
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
      setIsClearing(false);
      setShowClearModal(false);
    }
  };

  const fetchActivities = async (showLoading = true) => {
    if (showLoading && activities.length === 0) setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const filtered = (activities || []).filter((act) =>
    (act.userName || '').toLowerCase().includes(search.toLowerCase()) ||
    (act.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (act.entityName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-slate-800 leading-none">RECENT ACTIVITY</h1>
          <p className="font-sans text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">Historical timeline log of all newsroom system and task modifications.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#00adef]/10 text-[#00adef] font-sans text-xs font-bold px-3 py-1.5 rounded-lg border border-[#00adef]/20">
          <Calendar className="w-4 h-4" /> 
          {new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-GB', { day: 'numeric' })}-{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Main Search Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>
      </div>

      {/* Timeline List matching Page 14 exactly */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6 relative">
        {/* Left vertical timeline pipe */}
        <div className="absolute top-8 bottom-8 left-11 w-0.5 bg-slate-100" />

        {loading ? (
          <p className="text-xs text-slate-400 font-sans italic text-center py-6">Syncing activity records...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 font-sans italic text-center py-6">No recent activity logs found matching search.</p>
        ) : (
          filtered.map((act) => (
            <div key={act.id} className="flex gap-6 items-start relative z-10 hover:bg-slate-50/30 p-2 rounded-xl transition-all">
              {/* Left blue timeline dot */}
              <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-md self-center flex-shrink-0" />
              
              {/* User Avatar */}
              {act.userAvatar ? (
                <img
                  src={act.userAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}

              {/* Activity description content */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-0.5">
                <p className="font-sans text-xs sm:text-sm text-slate-600 leading-normal">
                  <span className="font-sans font-black text-slate-800 mr-1.5">{act.userName}</span>
                  <span className="text-slate-500 mr-1.5">{act.action}</span>
                  <span className="font-sans font-black text-slate-800 leading-none">{act.entityName}</span>
                </p>
                <span className="font-sans text-[11px] text-slate-500 whitespace-nowrap self-start sm:self-center font-medium flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear All Recent Activity"
        message="Are you sure you want to clear the entire global activity log? This action cannot be undone."
        confirmText="Clear Activity"
        cancelText="Cancel"
        onConfirm={handleClearActivity}
        onCancel={() => setShowClearModal(false)}
        isDestructive={true}
        isLoading={isClearing}
      />
    </div>
  );
};
