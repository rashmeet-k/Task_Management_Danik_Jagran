import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Search, Plus, UserPlus } from 'lucide-react';

interface MembersTabProps {
  projectId: string;
  token: string | null;
  role: string | undefined;
}

export const MembersTab: React.FC<MembersTabProps> = ({ projectId, token, role }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchUsers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        const users: User[] = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
        // For simulation, we have a list of user references on the project.
        // Let's load the seeded project to filter members or display all users as project members!
        // Page 10 of PDF displays members: Rashmeet Kaur, Jasbeer Singh.
        // Let's filter or list them elegantly! Let's display users who belong to the current project members list.
        const projRes = await fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (projRes.ok) {
          const projData = await projRes.json().catch(() => ([]));
          const projects = Array.isArray(projData) ? projData : [];
          const proj = projects.find((p: any) => p.id === projectId);
          if (proj && Array.isArray(proj.members)) {
            const filteredMembers = users.filter((u: any) => proj.members.includes(u.id));
            setMembers(filteredMembers);
          } else {
            setMembers(users);
          }
        } else {
          setMembers(users);
        }
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error(err);
      setMembers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setAllUsers(Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []));
      } else {
        setAllUsers([]);
      }
    } catch (err) {
      console.error(err);
      setAllUsers([]);
    }
  };

  const handleAddMemberToProject = async (userId: string) => {
    try {
      const projRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (projRes.ok) {
        const projects = await projRes.json().catch(() => ({}));
        const proj = projects.find((p: any) => p.id === projectId);
        if (proj) {
          if (proj.members.includes(userId)) return;
          const updatedMembers = [...proj.members, userId];
          const updateRes = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ members: updatedMembers })
          });
          if (updateRes.ok) {
            fetchMembers();
            setShowAddForm(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const safeMembers = Array.isArray(members) ? members : [];
  const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
  const filtered = safeMembers.filter((m) => {
    const formattedId = m.empId || (m.id ? (m.id.length > 5 ? `EMP-${m.id.slice(-4).toUpperCase()}` : `EMP-${m.id.padStart(3, '0')}`) : 'EMP-N/A');
    return (m.name || '').toLowerCase().includes(search.toLowerCase()) || 
           (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
           formattedId.toLowerCase().includes(search.toLowerCase());
  });

  const canManage = role === 'Admin' || role === 'Project Manager';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      {/* Search and action bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-72 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add Members
            </button>

            {showAddForm && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100">
                  <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Select member</span>
                </div>
                <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder="Search by ID or Name..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 outline-none focus:border-blue-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                {safeAllUsers
                  .filter(au => !safeMembers.some(m => m.id === au.id))
                  .filter(au => {
                    const formattedId = au.empId || (au.id ? (au.id.length > 5 ? `EMP-${au.id.slice(-4).toUpperCase()}` : `EMP-${au.id.padStart(3, '0')}`) : 'EMP-N/A');
                    return (au.name || '').toLowerCase().includes(addSearch.toLowerCase()) || 
                           formattedId.toLowerCase().includes(addSearch.toLowerCase());
                  })
                  .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { handleAddMemberToProject(u.id); setAddSearch(''); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-sans font-medium text-slate-700 flex items-center gap-2"
                  >
                    <img referrerPolicy="no-referrer" src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-5 h-5 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span>{u.name}</span>
                      <span className="text-[9px] text-slate-400">{u.empId || (u.id.length > 5 ? `EMP-${u.id.slice(-4).toUpperCase()}` : `EMP-${u.id.padStart(3, '0')}`)}</span>
                    </div>
                  </button>
                ))}
                {safeAllUsers.filter(au => !safeMembers.some(m => m.id === au.id)).length === 0 && (
                  <div className="px-4 py-2 text-xs font-sans text-slate-400">All users are already members.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Members table layout matching Page 10 */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tl-xl w-[15%] hidden sm:table-cell">Member ID</th>
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[35%] sm:w-[25%]">Member Name</th>
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[25%] hidden md:table-cell">Email</th>
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden lg:table-cell">Phone No</th>
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[20%] sm:w-[12%]">Roles</th>
              <th className="py-3.5 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tr-xl w-[10%] sm:w-[8%] text-center">Task</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-sans bg-white">No members added yet.</td>
              </tr>
            ) : (
            filtered.map((u) => (
              <tr key={u.id} className={`border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-all ${!u.active ? 'opacity-50' : ''}`}>
                <td className="py-3 px-4 font-mono text-[10px] sm:text-xs text-slate-500 font-bold truncate hidden sm:table-cell">
                  {u.empId || (u.id ? (u.id.length > 5 ? `EMP-${u.id.slice(-4).toUpperCase()}` : `EMP-${u.id.padStart(3, '0')}`) : 'EMP-N/A')}
                </td>
                <td className="py-3 px-4 truncate">
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <img referrerPolicy="no-referrer" src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover shadow-sm border border-slate-100" />
                      {u.active !== false && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Live/Active"></div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans font-bold text-[10px] sm:text-xs text-slate-800 truncate block">{u.name}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden md:table-cell">{u.email}</td>
                <td className="py-3 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden lg:table-cell">{u.phone}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[9px] sm:text-[10px] font-sans font-bold rounded-md shadow-xs text-white ${
                    u.role === 'Admin' ? 'bg-indigo-600 border border-indigo-700' :
                    u.role === 'Project Manager' ? 'bg-amber-500 border border-amber-600' :
                    'bg-slate-600 border border-slate-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 font-sans text-[10px] sm:text-xs text-slate-800 font-black text-center">{u.taskCount}</td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
