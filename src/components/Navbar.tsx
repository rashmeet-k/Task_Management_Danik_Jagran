import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="h-16 px-6 border-b border-[#1a1f2e] bg-[#0f121d] text-slate-300 flex items-center justify-between sticky top-0 z-20 no-invert">
      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right User Actions */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Dark Mode"
          className="p-2 text-slate-400 hover:text-[#ffffff] hover:bg-[#1a1f2e] rounded-full transition-colors relative"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-[#1a1f2e] pl-4">
          <button
            onClick={() => navigate('/settings')}
            title="Profile & Settings"
            className="flex items-center gap-2 hover:bg-[#1a1f2e] p-1.5 rounded-lg transition-all"
          >
            {user?.avatar ? (
              <img referrerPolicy="no-referrer" src={user.avatar} alt="User Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-600" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="hidden md:flex flex-col text-left">
              <span className="font-sans font-bold text-xs text-[#fdfdfd] leading-tight">{user?.name}</span>
              <span className="font-sans text-[10px] text-slate-400">{user?.role}</span>
            </div>
          </button>
          
          <button 
            onClick={logout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#1a1f2e] rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
