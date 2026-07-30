import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Project } from '../types';
import { OverviewTab } from '../components/OverviewTab';
import { AnnexuresTab } from '../components/AnnexuresTab';
import { TasksTab } from '../components/TasksTab';
import { MembersTab } from '../components/MembersTab';
import { CalendarComponent } from '../components/CalendarComponent';
import { DocumentsTab } from '../components/DocumentsTab';
import { ProjectActivityTab } from '../components/ProjectActivityTab';
import { ArrowLeft } from 'lucide-react';

type SubTab = 'overview' | 'annexure' | 'tasks' | 'members' | 'calendar' | 'documents' | 'activity';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Project[] = await res.json().catch(() => ({}));
        const found = data.find((p) => p.id === id);
        if (found) {
          setProject(found);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = (updatedProj: Partial<Project>) => {
    if (project) {
      setProject({ ...project, ...updatedProj } as Project);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-[#00adef] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="font-sans font-bold text-lg text-slate-700">Project not found</h2>
        <button onClick={() => navigate('/projects')} className="bg-[#00adef] text-white font-sans text-xs font-bold px-4 py-2 rounded-lg">
          Back to Projects
        </button>
      </div>
    );
  }

  const tabs: { id: SubTab; name: string }[] = [
    { id: 'overview', name: 'Overview' },
    { id: 'annexure', name: 'Annexure' },
    { id: 'tasks', name: user?.role === 'Team Member' ? 'My Tasks' : 'Tasks' },
    { id: 'members', name: 'Members' },
    { id: 'calendar', name: 'Calender' },
    { id: 'documents', name: 'Documents' },
    { id: 'activity', name: 'Activity' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Header back & title block */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-sans font-bold uppercase tracking-wider self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </button>
        <h1 className="font-sans font-black text-3xl text-slate-800 tracking-tight leading-none uppercase">
          PROJECT: {project.name}
        </h1>
      </div>

      {/* Segmented internal nav tabs matching Page 5 layout exactly */}
      <div className="border-b border-slate-200 bg-white p-1 rounded-xl flex overflow-x-auto shadow-sm gap-1 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-sans font-black text-xs sm:text-sm tracking-tight rounded-lg transition-all border-r border-slate-100 last:border-none uppercase whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#00adef]/10 text-[#00adef]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab contents load without refreshing! */}
      <div className="mt-2">
        {activeTab === 'overview' && (
          <OverviewTab project={project} onUpdateProject={handleUpdateProject} token={token} />
        )}
        {activeTab === 'annexure' && (
          <AnnexuresTab projectId={project.id} token={token} role={user?.role} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab projectId={project.id} projectName={project.name} token={token} role={user?.role} />
        )}
        {activeTab === 'members' && (
          <MembersTab projectId={project.id} token={token} role={user?.role} />
        )}
        {activeTab === 'calendar' && (
          <CalendarComponent projectId={project.id} projectName={project.name} token={token} role={user?.role} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab projectId={project.id} token={token} role={user?.role} />
        )}
        {activeTab === 'activity' && (
          <ProjectActivityTab projectId={project.id} token={token} />
        )}
      </div>

    </div>
  );
};
