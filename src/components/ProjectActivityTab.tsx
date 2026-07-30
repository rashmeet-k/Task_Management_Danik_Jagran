import React, { useState, useEffect } from 'react';
import { RecentActivity } from '../types';
import { User } from 'lucide-react';
import { formatTimeAgo } from '../lib/formatTime';
import { LiveTime } from './LiveTime';
import { Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../context/AuthContext';

interface ProjectActivityTabProps {
  projectId: string;
  token: string | null;
}

export const ProjectActivityTab: React.FC<ProjectActivityTabProps> = ({ projectId, token }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => {
      fetchActivities(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchActivities = async (showLoading = true) => {
    if (showLoading && activities.length === 0) setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/activities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setActivities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-[#00adef] border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleClearActivity = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/activities`, {
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

  const isAdminOrPM = user?.role === 'Admin' || user?.role === 'Project Manager';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-sans font-bold text-lg text-slate-800">Recent Activity</h2>
        {isAdminOrPM && activities.length > 0 && (
          <button 
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Activity
          </button>
        )}
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto pr-2">
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 font-sans italic p-4 text-center">No recent activity found for this project.</p>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex gap-4 items-start border-b border-slate-50 pb-4 last:border-0 animate-fadeIn">
              {act.userAvatar ? (
                <img
                  src={act.userAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-100 mt-1"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mt-1">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <p className="font-sans text-sm text-slate-700">
                  <span className="font-bold text-slate-800">{act.userName}</span> {act.action} <span className="font-bold text-slate-800">{act.entityName}</span>
                </p>
                <LiveTime time={act.timestamp} className="font-sans text-[11px] text-slate-400 font-medium" />
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Recent Activity"
        message="Are you sure you want to clear all recent activity logs for this project? This action cannot be undone."
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
