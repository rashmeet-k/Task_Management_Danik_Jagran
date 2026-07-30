import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, FolderClosed, TrendingUp, ClipboardList, Users, Search, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { Logo } from './Logo';

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { user, logout } = useAuth();

  const allMenuItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Projects', path: '/projects', icon: FolderClosed },
    { name: 'Recent Activity', path: '/activity', icon: TrendingUp },
    { name: 'Reports', path: '/reports', icon: ClipboardList },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const role = user?.role || 'Team Member';

  const menuItems = allMenuItems.filter(item => {
    if (item.path === '/reports' || item.path === '/activity') {
      return role === 'Admin' || role === 'Project Manager';
    }
    return true;
  });

  return (
    <>
      {/* Grey backdrop overlay behind the main screen when expanded */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-30 pointer-events-none"
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="print:hidden fixed left-0 top-0 bottom-0 bg-[#0f121d] text-[#e2e8f0] z-40 flex flex-col justify-between shadow-2xl overflow-hidden border-r border-[#1a1f2e]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isHovered ? '240px' : '72px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Top Branding Section */}
        <div>
          <div className="flex items-center h-16 px-4 border-b border-[#1a1f2e] overflow-hidden">
            <div className="flex items-center gap-3">
              {/* Sunrise Sunrise Icon Logo */}
              <Logo width="w-8" height="h-4" />
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-bold text-lg font-sans tracking-tight text-[#fdfdfd] flex-shrink-0"
                >
                  Dainik Jagran
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 px-3 flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 py-3 px-3 rounded-lg font-sans font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[#00adef]/10 text-[#00adef]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2e]'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info Section */}
        <div className="p-3 border-t border-[#1a1f2e]">
          <div className="flex items-center justify-between rounded-lg overflow-hidden">
            <NavLink 
              to="/settings"
              className="flex items-center gap-3 py-2 flex-1 hover:bg-[#1a1f2e] rounded-lg transition-colors overflow-hidden"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border border-slate-700 object-cover flex-shrink-0"
              />
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col overflow-hidden"
                >
                  <span className="font-sans font-bold text-sm text-[#fdfdfd] truncate whitespace-nowrap">{user?.name}</span>
                  <span className="font-sans text-xs text-slate-400 truncate whitespace-nowrap">{user?.role}</span>
                </motion.div>
              )}
            </NavLink>
            {isHovered && (
              <motion.button
                onClick={logout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                title="Logout"
                className="p-2 ml-1 text-slate-400 hover:text-red-500 hover:bg-[#1a1f2e] rounded-lg transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};
