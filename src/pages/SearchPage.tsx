import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, FolderClosed, CheckSquare, Users, Eye, History, Trash2, Activity } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveHistory = (q: string) => {
    const newHistory = [q, ...history.filter(item => item !== q)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  };

  useEffect(() => {
    setSearchInput(query);
    if (query) {
      fetchSearchResults();
      saveHistory(query);
    } else {
      setResults(null);
      setLoading(false);
    }
  }, [query]);

  const fetchSearchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="font-sans font-black text-2xl tracking-tight text-slate-800 leading-none">SEARCH</h1>
        <p className="font-sans text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">
          Find projects, tasks, and members across the organisation.
        </p>
      </div>

      {!query && history.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Searches
            </h2>
            <button 
              onClick={clearHistory}
              className="text-xs font-sans font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <div 
                key={i}
                onClick={() => setSearchParams({ q: h })}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-50 cursor-pointer transition-all"
              >
                <Search className="w-4 h-4 text-slate-300" />
                <span className="font-sans text-sm text-slate-700">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search projects, tasks, members..."
          className="w-full bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl pl-12 pr-4 py-4 text-sm font-sans outline-none focus:border-[#00adef] focus:ring-2 focus:ring-[#00adef]/20 transition-all placeholder:text-slate-400"
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-[#00adef] border-t-transparent animate-spin" />
        </div>
      ) : query && !results ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-[#00adef] border-t-transparent animate-spin" />
        </div>
      ) : results ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="font-sans font-bold text-lg text-slate-800">Results for &quot;{query}&quot;</span>
          </div>

          {/* Projects hits */}
          {results.projects?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FolderClosed className="w-4 h-4 text-blue-500" /> Projects ({results.projects.length})
              </h2>
              <div className="flex flex-col gap-3">
                {results.projects.map((proj: any) => (
                  <div
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-50 cursor-pointer transition-all"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-sans font-bold text-xs text-slate-800">{proj.name}</span>
                      <span className="font-sans text-[11px] text-slate-400 truncate max-w-lg">{proj.description}</span>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks hits */}
          {results.tasks?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" /> Tasks ({results.tasks.length})
              </h2>
              <div className="flex flex-col gap-3">
                {results.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-50 cursor-pointer transition-all"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-sans font-bold text-xs text-slate-800">{task.name}</span>
                      <span className="font-sans text-[11px] text-slate-400 truncate max-w-lg">{task.description}</span>
                    </div>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members hits */}
          {results.users?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Organisation Members ({results.users.length})
              </h2>
              <div className="flex flex-col gap-3">
                {results.users.map((member: any) => (
                  <div
                    key={member.id}
                    onClick={() => navigate('/members')}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-50 cursor-pointer transition-all"
                  >
                    <img referrerPolicy="no-referrer" src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-xs text-slate-800">{member.name}</span>
                      <span className="font-sans text-[10px] text-slate-400">{member.role} &bull; {member.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activities hits */}
          {user?.role === 'Admin' && results.activities?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="font-sans font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Recent Activity ({results.activities.length})
              </h2>
              <div className="flex flex-col gap-3">
                {results.activities.map((act: any) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-50 cursor-pointer transition-all"
                  >
                    <img referrerPolicy="no-referrer" src={act.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-xs text-slate-800">{act.userName} <span className="font-medium text-slate-500">{act.action}</span></span>
                      <span className="font-sans text-[10px] text-slate-400">{act.entityName} &bull; {act.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!results.projects || results.projects.length === 0) && 
           (!results.tasks || results.tasks.length === 0) && 
           (!results.users || results.users.length === 0) && 
           (!results.activities || results.activities.length === 0) && (
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-600 font-sans font-bold">No results found</p>
              <p className="text-xs text-slate-400 font-sans">We couldn&apos;t find anything matching &quot;{query}&quot;.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
