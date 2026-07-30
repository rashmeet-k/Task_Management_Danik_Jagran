import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Search, Plus, UserPlus, Trash2, Edit2, ShieldAlert, Eye, X } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Members: React.FC = () => {
  const { user, token } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'role'>('name');
  const [loading, setLoading] = useState(true);

  // User Form states (for Admin add/edit)
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formRole, setFormRole] = useState<'Admin' | 'Project Manager' | 'Team Member'>('Team Member');
  const [formBureau, setFormBureau] = useState('Kanpur Bureau / Print');
  const [formPass, setFormPass] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // View Profile state
  const [viewUser, setViewUser] = useState<User | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [user, token]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ([]));
        setMembers(Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []));
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error(err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const body: any = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      department: formDept,
      role: formRole,
      bureau: formBureau
    };
    if (formPass) {
      body.password = formPass;
    }

    try {
      const url = editId ? `/api/users/${editId}` : '/api/users';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        fetchMembers();
        handleCloseForm();
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (u: User) => {
    setEditId(u.id || (u as any)._id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPhone(u.phone);
    setFormDept(u.department);
    setFormRole(u.role);
    setFormBureau(u.bureau);
    setFormPass('');
    setShowForm(true);
  };

  const handleToggleActive = async (u: User) => {
    const uid = u.id || (u as any)._id;
    try {
      const res = await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !u.active })
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(prev => prev.filter(u => u.id !== targetId && (u as any)._id !== targetId));
      } else {
        const err = await res.json().catch(() => ({})).catch(() => ({}));
        alert(err.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
      fetchMembers();
    }
  };

  const handleCloseForm = () => {
    setEditId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDept('');
    setFormRole('Team Member');
    setFormBureau('Kanpur Bureau / Print');
    setFormPass('');
    setShowForm(false);
  };

  const safeMembers = Array.isArray(members) ? members : [];
  const filtered = safeMembers.filter((m) => {
    const formattedId = m.empId || (m.id ? (m.id.length > 5 ? `EMP-${m.id.slice(-4).toUpperCase()}` : `EMP-${m.id.padStart(3, '0')}`) : 'EMP-N/A');
    return (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
           (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
           (m.department || '').toLowerCase().includes(search.toLowerCase()) ||
           formattedId.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'role') {
      return (a.role || '').localeCompare(b.role || '');
    }
    return 0;
  });

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-slate-800 leading-none">MEMBER DIRECTORY</h1>
          <p className="font-sans text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">View and manage all organization team members.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-all self-start"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* User Edit / Add Form card Overlay */}
      {showForm && (
        <form onSubmit={handleSaveUser} className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col gap-4 shadow-lg animate-fadeIn">
          <h3 className="font-sans font-bold text-base text-slate-800">{editId ? 'Edit Profile particulars' : 'Register New Member'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Full Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Liam Phillips"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Email address</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="liam@jagran.com"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="987654321"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Department</label>
              <input
                type="text"
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                placeholder="e.g. Digital Media"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="Admin">Admin</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Team Member">Team Member</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Bureau / Edition</label>
              <select
                value={formBureau}
                onChange={(e) => setFormBureau(e.target.value)}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option>Kanpur Bureau / Print</option>
                <option>Delhi Bureau / Digital</option>
                <option>Noida Bureau / Print</option>
                <option>Mumbai Bureau / Print</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-500 uppercase">Password (Optional)</label>
              <input
                type="password"
                value={formPass}
                onChange={(e) => setFormPass(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleCloseForm}
              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-sans text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#00adef] hover:bg-sky-500 text-white font-sans text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
            >
              Save User
            </button>
          </div>
        </form>
      )}

      {/* Main Search Filtering row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-sans"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wider">Sort By:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'name' | 'role')}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="role">Role</option>
          </select>
        </div>
      </div>

      {/* Members Directory Table - EXACTLY like Page 13 layout */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tl-2xl w-[12%] hidden sm:table-cell">Member ID</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[30%]">Member Name</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[20%] hidden md:table-cell">Email</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden lg:table-cell">Phone No</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden sm:table-cell">Roles</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-tr-2xl text-center w-[15%] sm:w-[8%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 bg-white">Syncing database list...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 bg-white">No members found matching query.</td>
              </tr>
            ) : (
              filtered.map((u, idx) => (
                <tr key={u.id} className={`border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-all ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-4 font-mono text-[10px] sm:text-xs text-slate-500 font-bold truncate hidden sm:table-cell">
                    {u.empId || (u.id ? (u.id.length > 5 ? `EMP-${u.id.slice(-4).toUpperCase()}` : `EMP-${u.id.padStart(3, '0')}`) : 'EMP-N/A')}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img referrerPolicy="no-referrer" src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm" />
                        {u.active !== false && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Live/Active"></div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-sans font-bold text-[10px] sm:text-xs text-slate-800 truncate block">{u.name}</span>
                        <span className="font-sans text-[10px] text-slate-400 uppercase font-medium truncate block">{u.bureau}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden md:table-cell">{u.email}</td>
                  <td className="py-4 px-4 font-sans text-[10px] sm:text-xs text-slate-500 font-medium truncate hidden lg:table-cell">{u.phone}</td>
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-[#0f3278] text-[10px] font-sans font-bold text-white shadow-sm">
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewUser(u)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.active ? 'Deactivate user' : 'Activate user'}
                            className={`p-1.5 rounded transition-colors ${u.active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u.id || (u as any)._id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Delete User"
        message="Are you sure you want to delete this user permanently? This action cannot be undone."
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        isLoading={isDeleting}
      />
      
      {/* View Profile Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setViewUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 pb-6 flex flex-col items-center border-b border-slate-100">
              <div className="relative mb-4">
                <img 
                  referrerPolicy="no-referrer"
                  src={viewUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={viewUser.name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" 
                />
                {viewUser.active !== false && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full shadow-sm" title="Live/Active"></div>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight mb-1">{viewUser.name}</h2>
              <div className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide">
                  {viewUser.role}
                </span>
                <span className="text-sm font-medium text-slate-500">{viewUser.bureau}</span>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Employee ID</span>
                  <span className="block text-sm font-medium text-slate-700">
                    {viewUser.empId || (viewUser.id ? (viewUser.id.length > 5 ? `EMP-${viewUser.id.slice(-4).toUpperCase()}` : `EMP-${viewUser.id.padStart(3, '0')}`) : 'EMP-N/A')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Department</span>
                  <span className="block text-sm font-medium text-slate-700">{viewUser.department || 'N/A'}</span>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address</span>
                  <a href={`mailto:${viewUser.email}`} className="text-sm font-medium text-blue-600 hover:underline">{viewUser.email}</a>
                </div>
                <div className="h-px bg-slate-100 w-full"></div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Phone Number</span>
                  <a href={`tel:${viewUser.phone}`} className="text-sm font-medium text-blue-600 hover:underline">{viewUser.phone || 'N/A'}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
